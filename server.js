const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware для парсинга JSON и данных из форм
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));

// ==================== МАРШРУТЫ ДЛЯ СТРАНИЦ ====================

// Главная страница - список книг
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Страница добавления книги
app.get('/add-book', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'add-book.html'));
});

// Страница деталей книги
app.get('/book/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'book-detail.html'));
});

// Страница статистики
app.get('/statistics', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'statistics.html'));
});

// ==================== API ЭНДПОИНТЫ ====================

// Получить все книги
app.get('/api/books', (req, res) => {
    db.all('SELECT * FROM books ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить книгу по ID с заметками
app.get('/api/books/:id', (req, res) => {
    const id = req.params.id;
    
    db.get('SELECT * FROM books WHERE id = ?', [id], (err, book) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!book) {
            res.status(404).json({ error: 'Книга не найдена' });
            return;
        }
        
        db.all('SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC', [id], (err, notes) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ ...book, notes });
        });
    });
});

// Добавить новую книгу
app.post('/api/books', (req, res) => {
    const { title, author, total_pages, start_date } = req.body;
    
    if (!title || !author || !total_pages) {
        res.status(400).json({ error: 'Название, автор и количество страниц обязательны' });
        return;
    }
    
    db.run(
        `INSERT INTO books (title, author, total_pages, current_page, status, start_date) 
         VALUES (?, ?, ?, 0, 'planned', ?)`,
        [title, author, total_pages, start_date || null],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Книга успешно добавлена' });
        }
    );
});

// Обновить прогресс чтения
app.put('/api/books/:id/progress', (req, res) => {
    const id = req.params.id;
    const { current_page } = req.body;
    
    if (current_page === undefined || current_page < 0) {
        res.status(400).json({ error: 'Некорректное количество страниц' });
        return;
    }
    
    db.get('SELECT total_pages, current_page FROM books WHERE id = ?', [id], (err, book) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!book) {
            res.status(404).json({ error: 'Книга не найдена' });
            return;
        }
        
        if (current_page > book.total_pages) {
            res.status(400).json({ error: 'Прогресс не может превышать общее количество страниц' });
            return;
        }
        
        let status = 'reading';
        let finish_date = null;
        
        if (current_page === book.total_pages) {
            status = 'finished';
            finish_date = new Date().toISOString().split('T')[0];
        } else if (current_page > 0 && current_page < book.total_pages) {
            status = 'reading';
        } else if (current_page === 0) {
            status = 'planned';
        }
        
        db.run(
            `UPDATE books SET current_page = ?, status = ?, finish_date = ? WHERE id = ?`,
            [current_page, status, finish_date, id],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Прогресс обновлен', status, finish_date });
            }
        );
    });
});

// Обновить рейтинг книги
app.put('/api/books/:id/rating', (req, res) => {
    const id = req.params.id;
    const { rating } = req.body;
    
    if (rating === undefined || rating < 0 || rating > 5) {
        res.status(400).json({ error: 'Рейтинг должен быть от 0 до 5' });
        return;
    }
    
    db.run('UPDATE books SET rating = ? WHERE id = ?', [rating, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Рейтинг обновлен' });
    });
});

// Добавить заметку
app.post('/api/books/:id/notes', (req, res) => {
    const book_id = req.params.id;
    const { note_text } = req.body;
    
    if (!note_text || note_text.trim() === '') {
        res.status(400).json({ error: 'Текст заметки не может быть пустым' });
        return;
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
});

// Удалить книгу
app.delete('/api/books/:id', (req, res) => {
    const id = req.params.id;
    
    db.run('DELETE FROM books WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Книга не найдена' });
            return;
        }
        res.json({ message: 'Книга удалена' });
    });
});

// Получить статистику
app.get('/api/statistics', (req, res) => {
    db.get(`
        SELECT 
            COUNT(*) as total_books,
            SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) as finished_books,
            SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading_books,
            SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned_books,
            SUM(current_page) as total_pages_read,
            ROUND(AVG(rating), 1) as avg_rating,
            SUM(total_pages) as total_pages
        FROM books
    `, (err, stats) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(stats);
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('📚 TRACKER ПРОГРЕССА ЧТЕНИЯ');
    console.log('=================================');
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log('---------------------------------');
    console.log('📖 Доступные страницы:');
    console.log(`   • Главная:       http://localhost:${PORT}/`);
    console.log(`   • Добавить книгу: http://localhost:${PORT}/add-book`);
    console.log(`   • Статистика:    http://localhost:${PORT}/statistics`);
    console.log('=================================\n');
});