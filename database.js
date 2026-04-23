const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'reading_tracker.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Таблица пользователей (расширенная)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT,
            reading_goal_year INTEGER DEFAULT 0,
            reading_goal_month INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица книг
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            total_pages INTEGER DEFAULT 0,
            current_page INTEGER DEFAULT 0,
            rating INTEGER DEFAULT 0,
            review TEXT,
            image TEXT,
            status TEXT DEFAULT 'favorite',
            progress INTEGER DEFAULT 0,
            start_date TEXT,
            finish_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    // Добавляем колонки если их нет (для обновления старых баз)
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) return;
        const hasAvatar = columns.some(col => col.name === 'avatar');
        const hasGoalYear = columns.some(col => col.name === 'reading_goal_year');
        const hasGoalMonth = columns.some(col => col.name === 'reading_goal_month');
        
        if (!hasAvatar) db.run("ALTER TABLE users ADD COLUMN avatar TEXT");
        if (!hasGoalYear) db.run("ALTER TABLE users ADD COLUMN reading_goal_year INTEGER DEFAULT 0");
        if (!hasGoalMonth) db.run("ALTER TABLE users ADD COLUMN reading_goal_month INTEGER DEFAULT 0");
    });

    console.log('✅ База данных инициализирована');
});

module.exports = db;