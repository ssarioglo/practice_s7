-- 1. Создаем изолированные схемы (пространства имен)
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS finance_schema;

-- 2. Таблица пользователей внутри схемы авторизации (Для Java/Spring)
CREATE TABLE IF NOT EXISTS auth_schema.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Таблица правил внутри финансовой схемы (Для Go)
-- Обрати внимание: FOREIGN KEY на уровне СУБД здесь делать НЕЛЬЗЯ, 
-- так как таблицы лежат в изолированных микросервисных схемах.
CREATE TABLE IF NOT EXISTS finance_schema.finance_rules (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL, -- Логическая связь, контролируется кодом шлюза
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,
    category_type VARCHAR(20) NOT NULL DEFAULT 'COMMON',
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INT,
    external_id VARCHAR(255) DEFAULT NULL
);

-- 4. Таблица профиля и настроек пользователя (баланс, дата старта, горизонт, подушка)
CREATE TABLE IF NOT EXISTS finance_schema.user_profiles (
    user_id INT PRIMARY KEY,
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 120000.00,
    forecast_start_date DATE DEFAULT '2026-05-01',
    default_horizon_days INT NOT NULL DEFAULT 90,
    safety_buffer NUMERIC(12, 2) NOT NULL DEFAULT 20000.00,
    auto_today_start BOOLEAN NOT NULL DEFAULT FALSE,
    currency VARCHAR(10) NOT NULL DEFAULT 'RUB',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для ускорения выборок по пользователю
CREATE INDEX IF NOT EXISTS idx_finance_rules_user ON finance_schema.finance_rules(user_id);



-- бекап 2

-- -- Таблица пользователей (для авторизации)
-- CREATE TABLE IF NOT EXISTS users (
--     id SERIAL PRIMARY KEY,
--     email VARCHAR(150) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     webhook_secret VARCHAR(255) DEFAULT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Таблица правил движения денег (Разовые, Цикличные, Кредитные)
-- CREATE TABLE IF NOT EXISTS finance_rules (
--     id SERIAL PRIMARY KEY,
--     user_id INT NOT NULL,
--     title VARCHAR(150) NOT NULL,
    
--     -- Сумма: Плюс для доходов, Минус для расходов. 
--     -- Используем NUMERIC для финансовой точности, никакой плавающей точки (FLOAT)
--     amount NUMERIC(12, 2) NOT NULL,
    
--     -- Тип правила: 'ONCE' (разовый) или 'RECURRING' (циклический)
--     rule_type VARCHAR(20) NOT NULL,
    
--     -- Категория: 'COMMON' (обычный расход/доход) или 'CREDIT' (кредитные обязательства)
--     category_type VARCHAR(20) NOT NULL DEFAULT 'COMMON',
    
--     -- Дата для разовых платежей, или дата старта для циклических
--     start_date DATE NOT NULL,
    
--     -- Дата окончания (например, конец Яндекс Сплита или закрытие кредита). 
--     -- Если NULL — платеж бесконечный (например, подписка или ЖКХ)
--     end_date DATE,
    
--     -- Число месяца для цикличных платежей (например, 10 для зарплаты, 25 для кредитки).
--     -- Для разовых платежей ставится NULL
--     day_of_month INT,

--     -- Уникальный идентификатор внешней системы (например, gcal_abc123 для Google Calendar)
--     external_id VARCHAR(255) DEFAULT NULL,

--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- -- Индексы для ускорения выборок по пользователю (важно для диплома)
-- CREATE INDEX IF NOT EXISTS idx_finance_rules_user ON finance_rules(user_id);



-- бэкап

-- -- Таблица пользователей (для авторизации)
-- CREATE TABLE IF NOT EXISTS users (
--     id SERIAL PRIMARY KEY,
--     email VARCHAR(150) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Таблица правил движения денег (Разовые, Цикличные, Кредитные)
-- CREATE TABLE IF NOT EXISTS finance_rules (
--     id SERIAL PRIMARY KEY,
--     user_id INT NOT NULL,
--     title VARCHAR(150) NOT NULL,
    
--     -- Сумма: Плюс для доходов, Минус для расходов. 
--     -- Используем NUMERIC для финансовой точности, никакой плавающей точки (FLOAT)
--     amount NUMERIC(12, 2) NOT NULL,
    
--     -- Тип правила: 'ONCE' (разовый) или 'RECURRING' (циклический)
--     rule_type VARCHAR(20) NOT NULL,
    
--     -- Категория: 'COMMON' (обычный расход/доход) или 'CREDIT' (кредитные обязательства)
--     category_type VARCHAR(20) NOT NULL DEFAULT 'COMMON',
    
--     -- Дата для разовых платежей, или дата старта для циклических
--     start_date DATE NOT NULL,
    
--     -- Дата окончания (например, конец Яндекс Сплита или закрытие кредита). 
--     -- Если NULL — платеж бесконечный (например, подписка или ЖКХ)
--     end_date DATE,
    
--     -- Число месяца для цикличных платежей (например, 10 для зарплаты, 25 для кредитки).
--     -- Для разовых платежей ставится NULL
--     day_of_month INT,

--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- -- Индексы для ускорения выборок по пользователю
-- CREATE INDEX IF NOT EXISTS idx_finance_rules_user ON finance_rules(user_id);
