-- таблицы для бд постгрес

-- схемы под авторизацию и под сами финансы
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS finance_schema;

-- таблица юзеров для входа
CREATE TABLE IF NOT EXISTS auth_schema.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- настройки пользователя (начальный баланс, дата старта и тд)
CREATE TABLE IF NOT EXISTS finance_schema.user_profiles (
    user_id INT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL DEFAULT 'Сариогло С.Д.',
    initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 2200000.00,
    forecast_start_date DATE NOT NULL DEFAULT '2026-04-01',
    default_horizon_days INT NOT NULL DEFAULT 60,
    safety_buffer NUMERIC(14, 2) NOT NULL DEFAULT 100000.00,
    auto_today_start BOOLEAN NOT NULL DEFAULT FALSE,
    currency VARCHAR(10) NOT NULL DEFAULT 'RUB',
    seeded BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- справочник контрагентов
CREATE TABLE IF NOT EXISTS finance_schema.counterparties (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    inn VARCHAR(30) DEFAULT NULL,
    cp_type VARCHAR(30) NOT NULL DEFAULT 'VENDOR',
    contract VARCHAR(200) DEFAULT NULL,
    account_number VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_counterparties_user ON finance_schema.counterparties(user_id);

-- правила и операции
CREATE TABLE IF NOT EXISTS finance_schema.finance_rules (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    tx_type VARCHAR(20) NOT NULL DEFAULT 'EXPENSE',          -- INCOME или EXPENSE
    rule_type VARCHAR(20) NOT NULL DEFAULT 'ONCE',           -- разовая или циклическая
    interval_type VARCHAR(30) DEFAULT 'MONTH',               -- месяц, год, неделя и тд
    custom_interval_days INT DEFAULT NULL,
    day_of_month INT DEFAULT NULL,
    tx_date DATE DEFAULT NULL,                               -- дата если разовая
    start_date DATE NOT NULL DEFAULT '2026-04-01',           -- старт для циклической
    end_date DATE DEFAULT NULL,                              -- конец если есть
    category_type VARCHAR(40) NOT NULL DEFAULT 'OPERATIONAL',
    account_name VARCHAR(150) DEFAULT 'Р/с ••4812 (СберБизнес — Основной)',
    counterparty_id VARCHAR(64) DEFAULT NULL,
    counterparty_name VARCHAR(200) DEFAULT NULL,
    counterparty_inn VARCHAR(30) DEFAULT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    external_id VARCHAR(255) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_rules_user ON finance_schema.finance_rules(user_id);
