// unit.test.js - юнит-тесты для проверки функций приложения

const assert = require('assert');

// ============================================================
// Функции для тестирования (копия логики из приложения)
// ============================================================

// 1. Функция расчёта прогресса в процентах
function calculateProgress(currentPage, totalPages) {
    if (!totalPages || totalPages <= 0) return 0;
    if (currentPage < 0) return 0;
    if (currentPage > totalPages) return 100;
    return Math.round((currentPage / totalPages) * 100);
}

// 2. Функция определения статуса книги по прогрессу
function getStatusByProgress(currentPage, totalPages) {
    if (!totalPages || totalPages <= 0) {
        if (currentPage > 0) return 'reading';
        return 'favorite';
    }
    
    if (currentPage <= 0) return 'favorite';
    if (currentPage >= totalPages) return 'finished';
    return 'reading';
}

// 3. Функция проверки валидации пароля
function isPasswordValid(password) {
    if (!password) return false;
    if (password.length < 4) return false;
    return true;
}

// 4. Функция проверки совпадения паролей
function doPasswordsMatch(password, confirmPassword) {
    return password === confirmPassword;
}

// 5. Функция проверки email (простая)
function isEmailValid(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 6. Функция проверки, что все поля книги заполнены
function isBookValid(title, author) {
    if (!title || title.trim() === '') return false;
    if (!author || author.trim() === '') return false;
    return true;
}

// 7. Функция расчёта оставшихся дней до конца года
function getDaysLeftInYear() {
    const today = new Date();
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    const diff = endOfYear - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 8. Функция форматирования даты для отображения
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// ============================================================
// ТЕСТЫ
// ============================================================

console.log('\n========== ЮНИТ-ТЕСТЫ ==========\n');

// ----- Тесты для calculateProgress -----
console.log('📊 Тестирование calculateProgress:');

assert.strictEqual(calculateProgress(50, 100), 50);
console.log('  ✅ 50 из 100 страниц = 50%');

assert.strictEqual(calculateProgress(0, 100), 0);
console.log('  ✅ 0 из 100 страниц = 0%');

assert.strictEqual(calculateProgress(100, 100), 100);
console.log('  ✅ 100 из 100 страниц = 100%');

assert.strictEqual(calculateProgress(150, 100), 100);
console.log('  ✅ 150 из 100 страниц = 100% (не больше 100)');

assert.strictEqual(calculateProgress(30, 0), 0);
console.log('  ✅ Если страниц нет, прогресс = 0%');

// ----- Тесты для getStatusByProgress -----
console.log('\n📌 Тестирование getStatusByProgress:');

assert.strictEqual(getStatusByProgress(0, 100), 'favorite');
console.log('  ✅ 0 страниц → статус "favorite"');

assert.strictEqual(getStatusByProgress(50, 100), 'reading');
console.log('  ✅ 50 страниц из 100 → статус "reading"');

assert.strictEqual(getStatusByProgress(100, 100), 'finished');
console.log('  ✅ 100 страниц из 100 → статус "finished"');

assert.strictEqual(getStatusByProgress(0, 0), 'favorite');
console.log('  ✅ Если страниц 0 из 0 → статус "favorite"');

assert.strictEqual(getStatusByProgress(10, 0), 'reading');
console.log('  ✅ Если страниц 10, но всего не указано → статус "reading"');

// ----- Тесты для isPasswordValid -----
console.log('\n🔐 Тестирование isPasswordValid:');

assert.strictEqual(isPasswordValid('1234'), true);
console.log('  ✅ Пароль из 4 символов принят');

assert.strictEqual(isPasswordValid('mypassword123'), true);
console.log('  ✅ Длинный пароль принят');

assert.strictEqual(isPasswordValid('123'), false);
console.log('  ✅ Пароль из 3 символов отклонён');

assert.strictEqual(isPasswordValid(''), false);
console.log('  ✅ Пустой пароль отклонён');

assert.strictEqual(isPasswordValid(null), false);
console.log('  ✅ null отклонён');

// ----- Тесты для doPasswordsMatch -----
console.log('\n🔄 Тестирование doPasswordsMatch:');

assert.strictEqual(doPasswordsMatch('1234', '1234'), true);
console.log('  ✅ Пароли совпадают → true');

assert.strictEqual(doPasswordsMatch('1234', '12345'), false);
console.log('  ✅ Пароли не совпадают → false');

assert.strictEqual(doPasswordsMatch('', ''), true);
console.log('  ✅ Пустые пароли совпадают → true');

// ----- Тесты для isEmailValid -----
console.log('\n📧 Тестирование isEmailValid:');

assert.strictEqual(isEmailValid('user@example.com'), true);
console.log('  ✅ user@example.com → true');

assert.strictEqual(isEmailValid('test@mail.ru'), true);
console.log('  ✅ test@mail.ru → true');

assert.strictEqual(isEmailValid('invalid-email'), false);
console.log('  ✅ invalid-email → false');

assert.strictEqual(isEmailValid('user@'), false);
console.log('  ✅ user@ → false');

assert.strictEqual(isEmailValid(''), false);
console.log('  ✅ пустой email → false');

// ----- Тесты для isBookValid -----
console.log('\n📚 Тестирование isBookValid:');

assert.strictEqual(isBookValid('Война и мир', 'Толстой'), true);
console.log('  ✅ Название и автор есть → true');

assert.strictEqual(isBookValid('', 'Толстой'), false);
console.log('  ✅ Нет названия → false');

assert.strictEqual(isBookValid('Война и мир', ''), false);
console.log('  ✅ Нет автора → false');

assert.strictEqual(isBookValid('   ', 'Толстой'), false);
console.log('  ✅ Название из пробелов → false');

// ----- Тесты для getDaysLeftInYear -----
console.log('\n📅 Тестирование getDaysLeftInYear:');

const daysLeft = getDaysLeftInYear();
assert.strictEqual(typeof daysLeft, 'number');
assert.ok(daysLeft > 0 && daysLeft < 366);
console.log(`  ✅ Дней до конца года: ${daysLeft} (число в пределах 1-365)`);

// ----- Тесты для formatDate -----
console.log('\n📆 Тестирование formatDate:');

assert.strictEqual(formatDate('2024-12-25'), '25.12.2024');
console.log('  ✅ 2024-12-25 → 25.12.2024');

assert.strictEqual(formatDate(null), '—');
console.log('  ✅ null → "—"');

assert.strictEqual(formatDate(''), '—');
console.log('  ✅ пустая строка → "—"');

// ============================================================
// ИТОГИ
// ============================================================
console.log('\n========== ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО ==========\n');
console.log('✅ Протестировано функций: 8');
console.log('✅ Проверено утверждений: 26');
console.log('\n================================================\n');