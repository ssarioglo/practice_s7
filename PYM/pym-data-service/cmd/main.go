package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"pym-data-service/internal/models"

	_ "github.com/lib/pq"
)

type Env struct {
	db           *sql.DB
	predictorURL string
}

func main() {
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "pym_user")
	dbPass := getEnv("DB_PASSWORD", "pym_password")
	dbName := getEnv("DB_NAME", "pym_database")
	predictorURL := getEnv("PREDICTOR_URL", "http://pym-predictor:9802")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	var db *sql.DB
	var err error
	for i := 0; i < 10; i++ {
		db, err = sql.Open("postgres", dsn)
		if err == nil {
			err = db.Ping()
			if err == nil {
				break
			}
		}
		log.Printf("База данных еще не готова, ожидание... Попытка %d/10", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Не удалось подключиться к СУБД: %v", err)
	}
	defer db.Close()
	log.Println("Успешно подключено к PostgreSQL!")

	if err := initAndMigrateSchema(db); err != nil {
		log.Printf("Предупреждение при миграции схемы БД: %v", err)
	}

	env := &Env{db: db, predictorURL: predictorURL}

	http.HandleFunc("/api/v1/state", env.handleState)
	http.HandleFunc("/api/v1/profile", env.handleProfile)
	http.HandleFunc("/api/v1/rules", env.handleRules)
	http.HandleFunc("/api/v1/counterparties", env.handleCounterparties)
	http.HandleFunc("/api/v1/import", env.handleImport)
	http.HandleFunc("/api/v1/demo-reset", env.handleDemoReset)
	http.HandleFunc("/api/v1/forecast", env.handleForecast)
	http.HandleFunc("/api/v1/webhooks/", env.handleWebhooksRouter)

	log.Println("Микросервис pym-data-service успешно запущен на порту :9801")
	if err := http.ListenAndServe(":9801", nil); err != nil {
		log.Fatal(err)
	}
}

func initAndMigrateSchema(db *sql.DB) error {
	stmts := []string{
		`CREATE SCHEMA IF NOT EXISTS auth_schema;`,
		`CREATE SCHEMA IF NOT EXISTS finance_schema;`,
		`CREATE TABLE IF NOT EXISTS auth_schema.users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(150) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			webhook_secret VARCHAR(255) DEFAULT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS finance_schema.user_profiles (
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
		);`,
		`ALTER TABLE finance_schema.user_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) NOT NULL DEFAULT 'Сариогло С.Д.';`,
		`ALTER TABLE finance_schema.user_profiles ADD COLUMN IF NOT EXISTS seeded BOOLEAN NOT NULL DEFAULT FALSE;`,
		`CREATE TABLE IF NOT EXISTS finance_schema.counterparties (
			id SERIAL PRIMARY KEY,
			user_id INT NOT NULL,
			name VARCHAR(200) NOT NULL,
			inn VARCHAR(30) DEFAULT NULL,
			cp_type VARCHAR(30) NOT NULL DEFAULT 'VENDOR',
			contract VARCHAR(200) DEFAULT NULL,
			account_number VARCHAR(64) DEFAULT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS finance_schema.finance_rules (
			id SERIAL PRIMARY KEY,
			user_id INT NOT NULL,
			title VARCHAR(200) NOT NULL,
			amount NUMERIC(14, 2) NOT NULL,
			tx_type VARCHAR(20) NOT NULL DEFAULT 'EXPENSE',
			rule_type VARCHAR(20) NOT NULL DEFAULT 'ONCE',
			interval_type VARCHAR(30) DEFAULT 'MONTH',
			custom_interval_days INT DEFAULT NULL,
			day_of_month INT DEFAULT NULL,
			tx_date DATE DEFAULT NULL,
			start_date DATE NOT NULL DEFAULT '2026-04-01',
			end_date DATE DEFAULT NULL,
			category_type VARCHAR(40) NOT NULL DEFAULT 'OPERATIONAL',
			account_name VARCHAR(150) DEFAULT 'Р/с ••4812 (СберБизнес — Основной)',
			counterparty_id VARCHAR(64) DEFAULT NULL,
			counterparty_name VARCHAR(200) DEFAULT NULL,
			counterparty_inn VARCHAR(30) DEFAULT NULL,
			active BOOLEAN NOT NULL DEFAULT TRUE,
			external_id VARCHAR(255) DEFAULT NULL
		);`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS tx_type VARCHAR(20) NOT NULL DEFAULT 'EXPENSE';`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS interval_type VARCHAR(30) DEFAULT 'MONTH';`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS custom_interval_days INT DEFAULT NULL;`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS tx_date DATE DEFAULT NULL;`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS account_name VARCHAR(150) DEFAULT 'Р/с ••4812 (СберБизнес — Основной)';`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS counterparty_id VARCHAR(64) DEFAULT NULL;`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS counterparty_name VARCHAR(200) DEFAULT NULL;`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS counterparty_inn VARCHAR(30) DEFAULT NULL;`,
		`ALTER TABLE finance_schema.finance_rules ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;`,
	}

	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			log.Printf("SQL migration statement warning: %v", err)
		}
	}
	return nil
}

// если юзер зашел первый раз и база пустая - закидываем тестовые данные
func (env *Env) ensureUserSeeded(userID int) error {
	var seeded bool
	err := env.db.QueryRow(`SELECT seeded FROM finance_schema.user_profiles WHERE user_id = $1`, userID).Scan(&seeded)
	if err == nil && seeded {
		return nil
	}
	return env.seedDemoDataForUser(userID)
}

func (env *Env) seedDemoDataForUser(userID int) error {
	tx, err := env.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, _ = tx.Exec(`DELETE FROM finance_schema.finance_rules WHERE user_id = $1`, userID)
	_, _ = tx.Exec(`DELETE FROM finance_schema.counterparties WHERE user_id = $1`, userID)

	_, err = tx.Exec(`
		INSERT INTO finance_schema.user_profiles (user_id, full_name, initial_balance, forecast_start_date, default_horizon_days, seeded, updated_at)
		VALUES ($1, 'Сариогло С.Д.', 2200000.00, '2026-04-01', 60, TRUE, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id) DO UPDATE SET
			initial_balance = 2200000.00,
			forecast_start_date = '2026-04-01',
			default_horizon_days = 60,
			seeded = TRUE,
			updated_at = CURRENT_TIMESTAMP
	`, userID)
	if err != nil {
		return err
	}

	var cp1ID, cp2ID, cp3ID, cp4ID int
	_ = tx.QueryRow(`INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
		VALUES ($1, 'ООО "СтройКомплект"', '7701982341', 'CLIENT', 'Договор поставки № 14 от 10.01.2026', '40702810100000001122') RETURNING id`, userID).Scan(&cp1ID)
	_ = tx.QueryRow(`INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
		VALUES ($1, 'АО "ТехноСнаб"', '7705443322', 'VENDOR', 'Договор № 08 от 15.01.2026', '40702810500000008899') RETURNING id`, userID).Scan(&cp2ID)
	_ = tx.QueryRow(`INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
		VALUES ($1, 'ООО "Бизнес-Парк"', '7723123456', 'VENDOR', 'Договор аренды № А-09', '40702810300000005544') RETURNING id`, userID).Scan(&cp3ID)
	_ = tx.QueryRow(`INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
		VALUES ($1, 'ИФНС России № 7 по г. Москве', '7707083893', 'TAX', 'Единый налоговый счет (ЕНС)', '03100643000000018500') RETURNING id`, userID).Scan(&cp4ID)

	cp1Str := strconv.Itoa(cp1ID)
	cp2Str := strconv.Itoa(cp2ID)
	cp3Str := strconv.Itoa(cp3ID)
	cp4Str := strconv.Itoa(cp4ID)

	insertRuleSQL := `
		INSERT INTO finance_schema.finance_rules (
			user_id, title, amount, tx_type, rule_type, interval_type, day_of_month, tx_date, start_date,
			category_type, account_name, counterparty_id, counterparty_name, counterparty_inn, active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE)
	`

	accMain := "Р/с ••4812 (СберБизнес — Основной)"

	// приход от покупателя раз в месяц
	_, _ = tx.Exec(insertRuleSQL, userID, "Оплата от покупателя по договору поставки", 2400000.00, "INCOME", "RECURRING", "MONTH", 15, nil, "2026-04-01", "OPERATIONAL", accMain, cp1Str, `ООО "СтройКомплект"`, "7701982341")

	// оптовые заказы раз в 2 недели
	_, _ = tx.Exec(insertRuleSQL, userID, "Выручка от оптовых заказов", 850000.00, "INCOME", "RECURRING", "BIWEEKLY", nil, nil, "2026-04-08", "OPERATIONAL", accMain, cp1Str, `ООО "СтройКомплект"`, "7701982341")

	// закупка товара
	_, _ = tx.Exec(insertRuleSQL, userID, "Закупка партии товара у поставщика", -1500000.00, "EXPENSE", "RECURRING", "MONTH", 5, nil, "2026-04-01", "OPERATIONAL", accMain, cp2Str, `АО "ТехноСнаб"`, "7705443322")

	// зп сотрудникам 10 числа
	_, _ = tx.Exec(insertRuleSQL, userID, "Выплата зарплаты сотрудникам (ФОТ)", -1800000.00, "EXPENSE", "RECURRING", "MONTH", 10, nil, "2026-04-01", "PAYROLL", accMain, nil, nil, nil)

	// аренда 25 числа
	_, _ = tx.Exec(insertRuleSQL, userID, "Аренда офиса и склада", -450000.00, "EXPENSE", "RECURRING", "MONTH", 25, nil, "2026-04-01", "OPERATIONAL", accMain, cp3Str, `ООО "Бизнес-Парк"`, "7723123456")

	// налог в конце апреля (из-за него будет кассовый разрыв)
	_, _ = tx.Exec(insertRuleSQL, userID, "Уплата квартального налога", -950000.00, "EXPENSE", "ONCE", "MONTH", nil, "2026-04-28", "2026-04-28", "TAX", accMain, cp4Str, "ИФНС России № 7 по г. Москве", "7707083893")

	// старая операция за февраль для проверки архива
	_, _ = tx.Exec(insertRuleSQL, userID, "Покупка складского оборудования (закрыто)", -600000.00, "EXPENSE", "ONCE", "MONTH", nil, "2026-02-15", "2026-02-15", "INVESTMENT", accMain, cp2Str, `АО "ТехноСнаб"`, "7705443322")

	return tx.Commit()
}

func extractUserID(r *http.Request) (int, bool) {
	userIdStr := r.Header.Get("X-User-Id")
	if userIdStr == "" {
		return 0, false
	}
	uid, err := strconv.Atoi(userIdStr)
	if err != nil || uid <= 0 {
		return 0, false
	}
	return uid, true
}

func (env *Env) loadUserState(userID int) (models.StateResponse, error) {
	var state models.StateResponse
	if err := env.ensureUserSeeded(userID); err != nil {
		log.Printf("Seed error for user %d: %v", userID, err)
	}

	var startDate time.Time
	err := env.db.QueryRow(`
		SELECT user_id, full_name, initial_balance, forecast_start_date, default_horizon_days
		FROM finance_schema.user_profiles WHERE user_id = $1
	`, userID).Scan(
		&state.Profile.UserID,
		&state.Profile.FullName,
		&state.Profile.InitialBalance,
		&startDate,
		&state.Profile.Period,
	)
	if err != nil {
		state.Profile = models.UserProfileDTO{
			UserID:         userID,
			FullName:       "Сариогло С.Д.",
			InitialBalance: 2200000,
			StartDate:      "2026-04-01",
			Period:         60,
		}
	} else {
		state.Profile.StartDate = startDate.Format("2006-01-02")
	}

	cpRows, err := env.db.Query(`
		SELECT id, name, inn, cp_type, contract, account_number
		FROM finance_schema.counterparties WHERE user_id = $1 ORDER BY id ASC
	`, userID)
	state.Counterparties = []models.CounterpartyDTO{}
	if err == nil {
		defer cpRows.Close()
		for cpRows.Next() {
			var id int
			var cp models.CounterpartyDTO
			var inn, contract, acc sql.NullString
			if err := cpRows.Scan(&id, &cp.Name, &inn, &cp.Type, &contract, &acc); err == nil {
				cp.ID = strconv.Itoa(id)
				if inn.Valid && inn.String != "" {
					cp.Inn = &inn.String
				}
				if contract.Valid && contract.String != "" {
					cp.Contract = &contract.String
				}
				if acc.Valid && acc.String != "" {
					cp.AccountNumber = &acc.String
				}
				state.Counterparties = append(state.Counterparties, cp)
			}
		}
	}

	rules, err := env.queryRulesForUser(userID)
	if err != nil {
		state.Rules = []models.TransactionRuleDTO{}
	} else {
		state.Rules = rules
	}

	return state, nil
}

func (env *Env) queryRulesForUser(userID int) ([]models.TransactionRuleDTO, error) {
	rows, err := env.db.Query(`
		SELECT id, title, amount, tx_type, rule_type, interval_type, custom_interval_days,
		       day_of_month, tx_date, start_date, end_date, category_type, account_name,
		       counterparty_id, counterparty_name, counterparty_inn, active
		FROM finance_schema.finance_rules WHERE user_id = $1 ORDER BY id ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []models.TransactionRuleDTO{}
	for rows.Next() {
		var id int
		var r models.TransactionRuleDTO
		var rawAmount float64
		var txType, intervalType, category, accountName, cpID, cpName, cpInn sql.NullString
		var customDays, dayOfMonth sql.NullInt64
		var txDate, sDate, eDate sql.NullTime

		err := rows.Scan(
			&id, &r.Title, &rawAmount, &txType, &r.Recurrence, &intervalType, &customDays,
			&dayOfMonth, &txDate, &sDate, &eDate, &category, &accountName,
			&cpID, &cpName, &cpInn, &r.Active,
		)
		if err != nil {
			continue
		}

		r.ID = strconv.Itoa(id)
		r.Amount = math.Abs(rawAmount)
		if txType.Valid && (txType.String == "INCOME" || txType.String == "EXPENSE") {
			r.Type = txType.String
		} else if rawAmount >= 0 {
			r.Type = "INCOME"
		} else {
			r.Type = "EXPENSE"
		}

		if intervalType.Valid && intervalType.String != "" {
			val := intervalType.String
			r.IntervalType = &val
		}
		if customDays.Valid {
			val := int(customDays.Int64)
			r.CustomIntervalDays = &val
		}
		if dayOfMonth.Valid {
			val := int(dayOfMonth.Int64)
			r.DayOfMonth = &val
		}
		if txDate.Valid {
			val := txDate.Time.Format("2006-01-02")
			r.Date = &val
		} else if r.Recurrence == "ONCE" && sDate.Valid {
			val := sDate.Time.Format("2006-01-02")
			r.Date = &val
		}
		if sDate.Valid && r.Recurrence == "RECURRING" {
			val := sDate.Time.Format("2006-01-02")
			if r.IntervalType == nil || *r.IntervalType != "MONTH" || val != "2026-04-01" {
				r.StartDate = &val
			}
		}
		if eDate.Valid {
			val := eDate.Time.Format("2006-01-02")
			r.EndDate = &val
		}
		if category.Valid && category.String != "" {
			r.Category = category.String
		} else {
			r.Category = "OPERATIONAL"
		}
		r.Source = "MANUAL"
		if accountName.Valid && accountName.String != "" {
			val := accountName.String
			r.AccountName = &val
		}
		if cpID.Valid && cpID.String != "" {
			val := cpID.String
			r.CounterpartyID = &val
		}
		if cpName.Valid && cpName.String != "" {
			val := cpName.String
			r.CounterpartyName = &val
		}
		if cpInn.Valid && cpInn.String != "" {
			val := cpInn.String
			r.CounterpartyInn = &val
		}

		result = append(result, r)
	}
	return result, nil
}

func (env *Env) handleState(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	state, err := env.loadUserState(userID)
	if err != nil {
		http.Error(w, "Database Error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(state)
}

func (env *Env) handleProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var p models.UserProfileDTO
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if p.FullName == "" {
		p.FullName = "Сариогло С.Д."
	}
	if p.StartDate == "" {
		p.StartDate = "2026-04-01"
	}
	if p.Period <= 0 {
		p.Period = 60
	}

	_, err := env.db.Exec(`
		INSERT INTO finance_schema.user_profiles (user_id, full_name, initial_balance, forecast_start_date, default_horizon_days, seeded, updated_at)
		VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id) DO UPDATE SET
			full_name = EXCLUDED.full_name,
			initial_balance = EXCLUDED.initial_balance,
			forecast_start_date = EXCLUDED.forecast_start_date,
			default_horizon_days = EXCLUDED.default_horizon_days,
			updated_at = CURRENT_TIMESTAMP
	`, userID, p.FullName, p.InitialBalance, p.StartDate, p.Period)
	if err != nil {
		log.Printf("Profile update error: %v", err)
		http.Error(w, "Database Error", http.StatusInternalServerError)
		return
	}

	p.UserID = userID
	json.NewEncoder(w).Encode(p)
}

func (env *Env) handleDemoReset(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := env.seedDemoDataForUser(userID); err != nil {
		log.Printf("Demo reset error: %v", err)
		http.Error(w, "Database Error", http.StatusInternalServerError)
		return
	}

	state, _ := env.loadUserState(userID)
	json.NewEncoder(w).Encode(state)
}

func (env *Env) insertRuleIntoDB(userID int, dto models.TransactionRuleDTO) (models.TransactionRuleDTO, error) {
	posAmount := math.Abs(dto.Amount)
	txType := dto.Type
	if txType != "INCOME" && txType != "EXPENSE" {
		if dto.Amount >= 0 {
			txType = "INCOME"
		} else {
			txType = "EXPENSE"
		}
	}
	signedAmount := posAmount
	if txType == "EXPENSE" {
		signedAmount = -posAmount
	}

	rec := dto.Recurrence
	if rec != "ONCE" && rec != "RECURRING" {
		rec = "ONCE"
	}

	interval := "MONTH"
	if dto.IntervalType != nil && *dto.IntervalType != "" {
		interval = *dto.IntervalType
	}

	sDate := "2026-04-01"
	if rec == "ONCE" && dto.Date != nil && *dto.Date != "" {
		sDate = *dto.Date
	} else if dto.StartDate != nil && *dto.StartDate != "" {
		sDate = *dto.StartDate
	}

	cat := dto.Category
	if cat == "" {
		cat = "OPERATIONAL"
	}

	var newID int
	err := env.db.QueryRow(`
		INSERT INTO finance_schema.finance_rules (
			user_id, title, amount, tx_type, rule_type, interval_type, custom_interval_days,
			day_of_month, tx_date, start_date, end_date, category_type, account_name,
			counterparty_id, counterparty_name, counterparty_inn, active
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
		RETURNING id
	`,
		userID, dto.Title, signedAmount, txType, rec, interval, dto.CustomIntervalDays,
		dto.DayOfMonth, dto.Date, sDate, dto.EndDate, cat, dto.AccountName,
		dto.CounterpartyID, dto.CounterpartyName, dto.CounterpartyInn, dto.Active,
	).Scan(&newID)

	dto.ID = strconv.Itoa(newID)
	dto.Amount = posAmount
	dto.Type = txType
	dto.Recurrence = rec
	return dto, err
}

func (env *Env) handleRules(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		_ = env.ensureUserSeeded(userID)
		rules, err := env.queryRulesForUser(userID)
		if err != nil {
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(rules)

	case http.MethodPost:
		var dto models.TransactionRuleDTO
		if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		created, err := env.insertRuleIntoDB(userID, dto)
		if err != nil {
			log.Printf("Insert rule error: %v", err)
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(created)

	case http.MethodPut:
		ruleIDStr := r.URL.Query().Get("id")
		ruleID, _ := strconv.Atoi(ruleIDStr)
		var dto models.TransactionRuleDTO
		if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		if ruleID == 0 {
			ruleID, _ = strconv.Atoi(dto.ID)
		}

		posAmount := math.Abs(dto.Amount)
		signedAmount := posAmount
		if dto.Type == "EXPENSE" {
			signedAmount = -posAmount
		}
		sDate := "2026-04-01"
		if dto.Recurrence == "ONCE" && dto.Date != nil && *dto.Date != "" {
			sDate = *dto.Date
		} else if dto.StartDate != nil && *dto.StartDate != "" {
			sDate = *dto.StartDate
		}
		interval := "MONTH"
		if dto.IntervalType != nil && *dto.IntervalType != "" {
			interval = *dto.IntervalType
		}

		_, err := env.db.Exec(`
			UPDATE finance_schema.finance_rules
			SET title=$1, amount=$2, tx_type=$3, rule_type=$4, interval_type=$5,
			    custom_interval_days=$6, day_of_month=$7, tx_date=$8, start_date=$9,
			    end_date=$10, category_type=$11, account_name=$12, counterparty_id=$13,
			    counterparty_name=$14, counterparty_inn=$15, active=$16
			WHERE id=$17 AND user_id=$18
		`,
			dto.Title, signedAmount, dto.Type, dto.Recurrence, interval,
			dto.CustomIntervalDays, dto.DayOfMonth, dto.Date, sDate,
			dto.EndDate, dto.Category, dto.AccountName, dto.CounterpartyID,
			dto.CounterpartyName, dto.CounterpartyInn, dto.Active,
			ruleID, userID,
		)
		if err != nil {
			log.Printf("Update rule error: %v", err)
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		dto.ID = strconv.Itoa(ruleID)
		dto.Amount = posAmount
		json.NewEncoder(w).Encode(dto)

	case http.MethodDelete:
		ruleIDStr := r.URL.Query().Get("id")
		ruleID, _ := strconv.Atoi(ruleIDStr)
		_, err := env.db.Exec(`DELETE FROM finance_schema.finance_rules WHERE id = $1 AND user_id = $2`, ruleID, userID)
		if err != nil {
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		w.Write([]byte(`{"status":"success"}`))

	default:
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	}
}

func (env *Env) handleCounterparties(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodPost:
		var cp models.CounterpartyDTO
		if err := json.NewDecoder(r.Body).Decode(&cp); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		if cp.Type == "" {
			cp.Type = "VENDOR"
		}
		var newID int
		err := env.db.QueryRow(`
			INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
		`, userID, cp.Name, cp.Inn, cp.Type, cp.Contract, cp.AccountNumber).Scan(&newID)
		if err != nil {
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		cp.ID = strconv.Itoa(newID)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(cp)

	case http.MethodPut:
		cpIDStr := r.URL.Query().Get("id")
		cpID, _ := strconv.Atoi(cpIDStr)
		var cp models.CounterpartyDTO
		if err := json.NewDecoder(r.Body).Decode(&cp); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		if cpID == 0 {
			cpID, _ = strconv.Atoi(cp.ID)
		}
		_, err := env.db.Exec(`
			UPDATE finance_schema.counterparties
			SET name=$1, inn=$2, cp_type=$3, contract=$4, account_number=$5
			WHERE id=$6 AND user_id=$7
		`, cp.Name, cp.Inn, cp.Type, cp.Contract, cp.AccountNumber, cpID, userID)
		if err != nil {
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		cp.ID = strconv.Itoa(cpID)
		json.NewEncoder(w).Encode(cp)

	case http.MethodDelete:
		cpIDStr := r.URL.Query().Get("id")
		cpID, _ := strconv.Atoi(cpIDStr)
		_, err := env.db.Exec(`DELETE FROM finance_schema.counterparties WHERE id=$1 AND user_id=$2`, cpID, userID)
		if err != nil {
			http.Error(w, "Database Error", http.StatusInternalServerError)
			return
		}
		w.Write([]byte(`{"status":"success"}`))

	default:
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	}
}

func (env *Env) handleImport(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload models.ImportPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	for _, cp := range payload.Counterparties {
		cpType := cp.Type
		if cpType == "" {
			cpType = "VENDOR"
		}
		_, _ = env.db.Exec(`
			INSERT INTO finance_schema.counterparties (user_id, name, inn, cp_type, contract, account_number)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, userID, cp.Name, cp.Inn, cpType, cp.Contract, cp.AccountNumber)
	}

	for _, rule := range payload.Rules {
		rule.Active = true
		_, _ = env.insertRuleIntoDB(userID, rule)
	}

	state, _ := env.loadUserState(userID)
	json.NewEncoder(w).Encode(state)
}

func (env *Env) handleForecast(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := extractUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	queryParams := r.URL.Query()
	balanceStr := queryParams.Get("initialBalance")
	if balanceStr == "" {
		balanceStr = "2200000"
	}
	currentBalance, _ := strconv.ParseFloat(balanceStr, 64)

	startDate := queryParams.Get("startDate")
	if startDate == "" {
		startDate = "2026-04-01"
	}

	periodStr := queryParams.Get("periodDays")
	if periodStr == "" {
		periodStr = "60"
	}
	periodDays, _ := strconv.Atoi(periodStr)

	rows, err := env.db.Query(`
		SELECT id, user_id, title, amount, rule_type, interval_type, custom_interval_days,
		       category_type, start_date, end_date, day_of_month, active
		FROM finance_schema.finance_rules WHERE user_id = $1
	`, userID)
	if err != nil {
		http.Error(w, "Database Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	rules := []models.FinanceRule{}
	for rows.Next() {
		var fr models.FinanceRule
		var sDate time.Time
		var eDate sql.NullTime
		var interval sql.NullString
		var customDays, dayOfMonth sql.NullInt64

		if err := rows.Scan(&fr.ID, &fr.UserID, &fr.Title, &fr.Amount, &fr.RuleType, &interval, &customDays,
			&fr.CategoryType, &sDate, &eDate, &dayOfMonth, &fr.Active); err != nil {
			continue
		}
		fr.StartDate = sDate.Format("2006-01-02")
		if eDate.Valid {
			d := eDate.Time.Format("2006-01-02")
			fr.EndDate = &d
		}
		if interval.Valid {
			v := interval.String
			fr.IntervalType = &v
		}
		if customDays.Valid {
			v := int(customDays.Int64)
			fr.CustomIntervalDays = &v
		}
		if dayOfMonth.Valid {
			v := int(dayOfMonth.Int64)
			fr.DayOfMonth = &v
		}
		rules = append(rules, fr)
	}

	predictReq := models.PredictRequest{
		CurrentBalance: currentBalance,
		StartDate:      startDate,
		PeriodDays:     periodDays,
		Rules:          rules,
	}

	jsonData, _ := json.Marshal(predictReq)
	pythonURL := fmt.Sprintf("%s/api/v1/predict", env.predictorURL)
	resp, err := http.Post(pythonURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		http.Error(w, "Predictor Service Unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	var predictResp models.PredictResponse
	if err := json.NewDecoder(resp.Body).Decode(&predictResp); err != nil {
		http.Error(w, "Unmarshal Error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(predictResp)
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}

func (env *Env) handleWebhooksRouter(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	path := strings.TrimSuffix(r.URL.Path, "/")
	if strings.HasSuffix(path, "/google") {
		env.handleGoogleWebhook(w, r)
		return
	} else if strings.HasSuffix(path, "/telegram") {
		env.handleTelegramWebhook(w, r)
		return
	}
	http.Error(w, "Unknown webhook endpoint", http.StatusNotFound)
}

func (env *Env) handleGoogleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	googleToken := r.Header.Get("X-Goog-Channel-Token")
	if googleToken == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var userID int
	err := env.db.QueryRow(`SELECT id FROM auth_schema.users WHERE webhook_secret = $1`, googleToken).Scan(&userID)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"success","provider":"google"}`))
}

func (env *Env) handleTelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	tgToken := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
	botToken := getEnv("TELEGRAM_BOT_TOKEN", "default_secure_fallback_token_for_vkr_tests")
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	h := hmac.New(sha256.New, []byte(botToken))
	h.Write(bodyBytes)
	expectedHash := hex.EncodeToString(h.Sum(nil))
	if tgToken == "" && expectedHash == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"success","provider":"telegram"}`))
}
