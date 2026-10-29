-- таблицы и стартовые данные для бд постгрес

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

-- начальное заполнение бд тестовыми данными если таблицы пустые
DO $$
DECLARE
    uid INT;
    cp1_id INT;
    cp2_id INT;
    cp3_id INT;
    cp4_id INT;
BEGIN
    -- добавляем двух дефолтных юзеров (sarioglo / 123456 и admin / admin123)
    INSERT INTO auth_schema.users (email, password_hash, webhook_secret)
    VALUES ('sarioglo', '123456', 'secret-sarioglo-2026')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO auth_schema.users (email, password_hash, webhook_secret)
    VALUES ('admin', 'admin123', 'secret-admin-2026')
    ON CONFLICT (email) DO NOTHING;

    -- для каждого юзера закидываем профиль, контрагентов и операции если их еще нет
    FOR uid IN SELECT id FROM auth_schema.users LOOP
        IF NOT EXISTS (SELECT 1 FROM finance_schema.user_profiles WHERE user_id = uid AND seeded = TRUE) THEN
            INSERT INTO finance_schema.user_profiles (
                user_id, full_name, initial_balance, forecast_start_date, default_horizon_days, seeded, updated_at
            ) VALUES (
                uid,
                CASE WHEN uid = 1 THEN 'Сариогло С.Д.' ELSE 'Администратор (Фин. отдел)' END,
                2200000.00,
                '2026-04-01',
                60,
                TRUE,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id) DO UPDATE SET seeded = TRUE;

            INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
            VALUES (uid, 'ООО "СтройКомплект"', '7701982341', 'CLIENT', 'Договор поставки № 14 от 10.01.2026', '40702810100000001122')
            RETURNING id INTO cp1_id;

            INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
            VALUES (uid, 'АО "ТехноСнаб"', '7705443322', 'VENDOR', 'Договор № 08 от 15.01.2026', '40702810500000008899')
            RETURNING id INTO cp2_id;

            INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
            VALUES (uid, 'ООО "Бизнес-Парк"', '7723123456', 'VENDOR', 'Договор аренды № А-09', '40702810300000005544')
            RETURNING id INTO cp3_id;

            INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
            VALUES (uid, 'ИФНС России № 7 по г. Москве', '7707083893', 'TAX', 'Единый налоговый счет (ЕНС)', '03100643000000018500')
            RETURNING id INTO cp4_id;

            INSERT INTO finance_schema.finance_rules (
                user_id, title, amount, tx_type, rule_type, interval_type, day_of_month, tx_date, start_date,
                category_type, account_name, counterparty_id, counterparty_name, counterparty_inn, active
            ) VALUES
            (uid, 'Оплата от покупателя по договору поставки', 2400000.00, 'INCOME', 'RECURRING', 'MONTH', 15, NULL, '2026-04-01', 'OPERATIONAL', 'Р/с ••4812 (СберБизнес — Основной)', cp1_id::TEXT, 'ООО "СтройКомплект"', '7701982341', TRUE),
            (uid, 'Выручка от оптовых заказов', 850000.00, 'INCOME', 'RECURRING', 'BIWEEKLY', NULL, NULL, '2026-04-08', 'OPERATIONAL', 'Р/с ••4812 (СберБизнес — Основной)', cp1_id::TEXT, 'ООО "СтройКомплект"', '7701982341', TRUE),
            (uid, 'Закупка партии товара у поставщика', -1500000.00, 'EXPENSE', 'RECURRING', 'MONTH', 5, NULL, '2026-04-01', 'OPERATIONAL', 'Р/с ••4812 (СберБизнес — Основной)', cp2_id::TEXT, 'АО "ТехноСнаб"', '7705443322', TRUE),
            (uid, 'Выплата зарплаты сотрудникам (ФОТ)', -1800000.00, 'EXPENSE', 'RECURRING', 'MONTH', 10, NULL, '2026-04-01', 'PAYROLL', 'Р/с ••4812 (СберБизнес — Основной)', NULL, NULL, NULL, TRUE),
            (uid, 'Аренда офиса и склада', -450000.00, 'EXPENSE', 'RECURRING', 'MONTH', 25, NULL, '2026-04-01', 'OPERATIONAL', 'Р/с ••4812 (СберБизнес — Основной)', cp3_id::TEXT, 'ООО "Бизнес-Парк"', '7723123456', TRUE),
            (uid, 'Уплата квартального налога', -950000.00, 'EXPENSE', 'ONCE', 'MONTH', NULL, '2026-04-28', '2026-04-28', 'TAX', 'Р/с ••4812 (СберБизнес — Основной)', cp4_id::TEXT, 'ИФНС России № 7 по г. Москве', '7707083893', TRUE),
            (uid, 'Покупка складского оборудования (закрыто)', -600000.00, 'EXPENSE', 'ONCE', 'MONTH', NULL, '2026-02-15', '2026-02-15', 'INVESTMENT', 'Р/с ••4812 (СберБизнес — Основной)', cp2_id::TEXT, 'АО "ТехноСнаб"', '7705443322', TRUE);
        END IF;
    END LOOP;
END $$;
