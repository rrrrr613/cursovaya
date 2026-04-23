const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'reading_tracker.db');
const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
db.serialize(() => {
    // Таблица книг
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            total_pages INTEGER NOT NULL,
            current_page INTEGER DEFAULT 0,
            status TEXT DEFAULT 'planned',
            rating INTEGER DEFAULT 0,
            start_date TEXT,
            finish_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица заметок
    db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            note_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        )
    `);

    // Добавляем тестовые данные, если таблица пуста
    db.get("SELECT COUNT(*) as count FROM books", (err, row) => {
        if (err) {
            console.error('Ошибка проверки БД:', err.message);
            return;
        }
        
        if (row.count === 0) {
            console.log('📚 Добавление тестовых данных...');
            const testBooks = [
                ['Война и мир', 'Лев Толстой', 1300, 450, 'reading', 5, '2024-01-15', null],
                ['Преступление и наказание', 'Фёдор Достоевский', 670, 670, 'finished', 5, '2024-02-01', '2024-03-20'],
                ['Мастер и Маргарита', 'Михаил Булгаков', 480, 120, 'reading', 4, '2024-03-10', null],
                ['Евгений Онегин', 'Александр Пушкин', 320, 0, 'planned', 0, null, null],
                ['1984', 'Джордж Оруэлл', 400, 400, 'finished', 5, '2024-01-10', '2024-02-15'],
                ['Маленький принц', 'Антуан де Сент-Экзюпери', 120, 60, 'reading', 5, '2024-03-20', null]
            ];
            
            testBooks.forEach(book => {
                db.run(
                    `INSERT INTO books (title, author, total_pages, current_page, status, rating, start_date, finish_date) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    book
                );
            });
            console.log('✅ Тестовые данные добавлены');
        }
    });
});

module.exports = db;