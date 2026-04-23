const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));

// Настройка сессий
app.use(session({
    secret: 'secret-key-for-reading-tracker',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 часа
}));

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Не авторизован' });
        }
        return res.redirect('/login');
    }
    next();
}

// ==================== СТРАНИЦЫ ====================

app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/favorites', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'favorites.html'));
});

app.get('/profile', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// ==================== API АВТОРИЗАЦИИ ====================

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть минимум 4 символа' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Пользователь с таким email или именем уже существует' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Регистрация успешна! Войдите в систему' });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    
    if (!login || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [login, login],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Неверный логин или пароль' });
            }
            
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Неверный логин или пароль' });
            }
            
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ message: 'Вход выполнен', username: user.username });
        }
    );
});

// Проверка авторизации (для фронта)
app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// ==================== API КНИГ ====================

// Получить все книги пользователя
app.get('/api/books', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC',
        [req.session.userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Получить книгу по ID (только свою)
app.get('/api/books/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    
    db.get(
        'SELECT * FROM books WHERE id = ? AND user_id = ?',
        [id, req.session.userId],
        (err, book) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (!book) {
                res.status(404).json({ error: 'Книга не найдена' });
                return;
            }
            
            db.all(
                'SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC',
                [id],
                (err, notes) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ ...book, notes });
                }
            );
        }
    );
});

// Добавить новую книгу
app.post('/api/books', requireAuth, (req, res) => {
    const { title, author, total_pages, current_page, rating, review, status, progress } = req.body;
    
    if (!title || !author) {
        res.status(400).json({ error: 'Название и автор обязательны' });
        return;
    }
    
    const finalStatus = status || 'favorite';
    const finalProgress = progress || 0;
    const finalCurrentPage = current_page || 0;
    const finalTotalPages = total_pages || 0;
    const finalRating = rating || 0;
    
    db.run(
        `INSERT INTO books (user_id, title, author, total_pages, current_page, rating, review, status, progress) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.session.userId, title, author, finalTotalPages, finalCurrentPage, finalRating, review || '', finalStatus, finalProgress],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Книга успешно добавлена' });
        }
    );
});

// Обновить книгу (PUT)
app.put('/api/books/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    const { title, author, total_pages, current_page, rating, review, status } = req.body;
    
    let progress = 0;
    if (total_pages > 0 && current_page) {
        progress = Math.round(current_page / total_pages * 100);
    }
    
    db.run(
        `UPDATE books SET 
            title = ?, 
            author = ?, 
            total_pages = ?, 
            current_page = ?, 
            rating = ?, 
            review = ?, 
            status = ?, 
            progress = ?
         WHERE id = ? AND user_id = ?`,
        [title, author, total_pages || 0, current_page || 0, rating || 0, review || '', status || 'favorite', progress, id, req.session.userId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Книга не найдена' });
                return;
            }
            res.json({ message: 'Книга обновлена' });
        }
    );
});

// Обновить прогресс чтения
app.put('/api/books/:id/progress', requireAuth, (req, res) => {
    const id = req.params.id;
    const { current_page } = req.body;
    
    db.get(
        'SELECT total_pages, current_page FROM books WHERE id = ? AND user_id = ?',
        [id, req.session.userId],
        (err, book) => {
            if (err || !book) {
                return res.status(404).json({ error: 'Книга не найдена' });
            }
            
            if (current_page > book.total_pages) {
                return res.status(400).json({ error: 'Прогресс не может превышать общее количество страниц' });
            }
            
            let status = 'reading';
            let finish_date = null;
            let progress = 0;
            
            if (book.total_pages > 0) {
                progress = Math.round(current_page / book.total_pages * 100);
            }
            
            if (current_page === book.total_pages && book.total_pages > 0) {
                status = 'finished';
                finish_date = new Date().toISOString().split('T')[0];
            } else if (current_page === 0) {
                status = 'favorite';
            }
            
            db.run(
                `UPDATE books SET current_page = ?, status = ?, finish_date = ?, progress = ? WHERE id = ? AND user_id = ?`,
                [current_page, status, finish_date, progress, id, req.session.userId],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ message: 'Прогресс обновлен', status });
                }
            );
        }
    );
});

// Обновить рейтинг
app.put('/api/books/:id/rating', requireAuth, (req, res) => {
    const id = req.params.id;
    const { rating } = req.body;
    
    db.run(
        'UPDATE books SET rating = ? WHERE id = ? AND user_id = ?',
        [rating, id, req.session.userId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Рейтинг обновлен' });
        }
    );
});

// Добавить заметку
app.post('/api/books/:id/notes', requireAuth, (req, res) => {
    const book_id = req.params.id;
    const { note_text } = req.body;
    
    db.get(
        'SELECT id FROM books WHERE id = ? AND user_id = ?',
        [book_id, req.session.userId],
        (err, book) => {
            if (err || !book) {
                return res.status(404).json({ error: 'Книга не найдена' });
            }
            
            db.run(
                'INSERT INTO notes (book_id, note_text) VALUES (?, ?)',
                [book_id, note_text],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ id: this.lastID, message: 'Заметка добавлена' });
                }
            );
        }
    );
});

// Удалить книгу
app.delete('/api/books/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    
    db.run(
        'DELETE FROM books WHERE id = ? AND user_id = ?',
        [id, req.session.userId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Книга не найдена' });
                return;
            }
            res.json({ message: 'Книга удалена' });
        }
    );
});

// ==================== API ПРОФИЛЯ ====================

// Получить профиль пользователя
app.get('/api/profile', requireAuth, (req, res) => {
    db.get(
        'SELECT id, username, email, avatar, reading_goal_year, reading_goal_month, created_at FROM users WHERE id = ?',
        [req.session.userId],
        (err, user) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            const currentYearStr = currentYear.toString();
            const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
            
            // Общая статистика
            db.get(
                `SELECT 
                    COUNT(*) as total_books,
                    SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) as finished_books,
                    SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading_books,
                    SUM(total_pages) as total_pages,
                    SUM(CASE WHEN status = 'finished' THEN total_pages ELSE 0 END) as pages_read,
                    ROUND(AVG(CASE WHEN rating > 0 THEN rating ELSE NULL END), 1) as avg_rating
                FROM books WHERE user_id = ?`,
                [req.session.userId],
                (err, stats) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    // Книги за этот год (по дате завершения ИЛИ дате создания для статуса finished)
                    db.get(
                        `SELECT COUNT(*) as year_books FROM books 
                         WHERE user_id = ? AND status = 'finished' 
                         AND (strftime('%Y', finish_date) = ? OR strftime('%Y', created_at) = ?)`,
                        [req.session.userId, currentYearStr, currentYearStr],
                        (err, yearStats) => {
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            
                            // Книги за этот месяц
                            db.get(
                                `SELECT COUNT(*) as month_books FROM books 
                                 WHERE user_id = ? AND status = 'finished' 
                                 AND (strftime('%Y-%m', finish_date) = ? OR strftime('%Y-%m', created_at) = ?)`,
                                [req.session.userId, currentMonthStr, currentMonthStr],
                                (err, monthStats) => {
                                    if (err) {
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    
                                    res.json({
                                        user: {
                                            username: user.username,
                                            email: user.email,
                                            avatar: user.avatar,
                                            reading_goal_year: user.reading_goal_year || 0,
                                            reading_goal_month: user.reading_goal_month || 0,
                                            joined: user.created_at
                                        },
                                        stats: {
                                            total_books: stats.total_books || 0,
                                            finished_books: stats.finished_books || 0,
                                            reading_books: stats.reading_books || 0,
                                            total_pages: stats.total_pages || 0,
                                            pages_read: stats.pages_read || 0,
                                            avg_rating: stats.avg_rating || 0
                                        },
                                        goals: {
                                            year_books: yearStats?.year_books || 0,
                                            month_books: monthStats?.month_books || 0
                                        }
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Обновить цели чтения
app.put('/api/profile/goals', requireAuth, (req, res) => {
    const { reading_goal_year, reading_goal_month } = req.body;
    
    db.run(
        'UPDATE users SET reading_goal_year = ?, reading_goal_month = ? WHERE id = ?',
        [reading_goal_year || 0, reading_goal_month || 0, req.session.userId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Цели обновлены' });
        }
    );
});

// Обновить аватар
app.put('/api/profile/avatar', requireAuth, (req, res) => {
    const { avatar } = req.body;
    
    db.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatar, req.session.userId],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Аватар обновлён' });
        }
    );
});

// Статистика по месяцам (для графика)
app.get('/api/profile/monthly-stats', requireAuth, (req, res) => {
    const currentYear = new Date().getFullYear();
    
    db.all(
        `SELECT strftime('%m', finish_date) as month, COUNT(*) as count 
         FROM books 
         WHERE user_id = ? AND status = 'finished' AND strftime('%Y', finish_date) = ?
         GROUP BY strftime('%m', finish_date)
         ORDER BY month`,
        [req.session.userId, currentYear.toString()],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Заполняем все месяцы
            const monthlyData = {};
            for (let i = 1; i <= 12; i++) {
                monthlyData[i] = 0;
            }
            rows.forEach(row => {
                monthlyData[parseInt(row.month)] = row.count;
            });
            
            res.json(monthlyData);
        }
    );
});

// Любимые авторы (топ 5)
app.get('/api/profile/top-authors', requireAuth, (req, res) => {
    db.all(
        `SELECT author, COUNT(*) as count 
         FROM books 
         WHERE user_id = ? AND status = 'finished'
         GROUP BY author 
         ORDER BY count DESC 
         LIMIT 5`,
        [req.session.userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});


// Получить статистику пользователя
app.get('/api/statistics', requireAuth, (req, res) => {
    db.get(
        `SELECT 
            COUNT(*) as total_books,
            SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) as finished_books,
            SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading_books,
            SUM(CASE WHEN status = 'favorite' THEN 1 ELSE 0 END) as favorite_books,
            SUM(current_page) as total_pages_read,
            ROUND(AVG(rating), 1) as avg_rating,
            SUM(total_pages) as total_pages
        FROM books WHERE user_id = ?`,
        [req.session.userId],
        (err, stats) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(stats);
        }
    );
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n=================================');
    console.log('📚 ЧИТАТЕЛЬСКИЙ ДНЕВНИК');
    console.log('=================================');
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log('---------------------------------');
    console.log('📖 Доступные страницы:');
    console.log(`   • Регистрация:  http://localhost:${PORT}/register`);
    console.log(`   • Вход:         http://localhost:${PORT}/login`);
    console.log(`   • Главная:      http://localhost:${PORT}/`);
    console.log(`   • Избранное:    http://localhost:${PORT}/favorites`);
    console.log('=================================\n');
});