package models

import "time"

// User описывает структуру пользователя из таблицы users
type User struct {
	ID            int       `json:"id"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"password_hash"`
	WebhookSecret *string   `json:"webhook_secret"` // Токен для верификации Google
	CreatedAt     time.Time `json:"created_at"`
}

// FinanceRule описывает структуру финансового правила (транзакции или плана)
type FinanceRule struct {
	ID           int     `json:"id"`
	UserID       int     `json:"user_id"`
	Title        string  `json:"title"`
	Amount       float64 `json:"amount"`
	RuleType     string  `json:"rule_type"`     // "ONCE" (разовый) или "RECURRING" (циклический)
	CategoryType string  `json:"category_type"` // "COMMON" (обычный) или "CREDIT" (кредитное обязательство)
	StartDate    string  `json:"start_date"`    // Формат: YYYY-MM-DD
	EndDate      *string `json:"end_date"`      // Может быть null (для бесконечных подписок/циклов)
	DayOfMonth   *int    `json:"day_of_month"`  // Может быть null (для разовых платежей)
	ExternalID   *string `json:"external_id"`   // Будет хранить ID из Google
}

// PredictRequest описывает структуру JSON-пакета, который Go отправляет в Python
type PredictRequest struct {
	CurrentBalance float64       `json:"current_balance"`
	StartDate      string        `json:"start_date"`
	PeriodDays     int           `json:"period_days"`
	Rules          []FinanceRule `json:"rules"`
}

// Point описывает одну координату на будущем графике
type Point struct {
	Date    string  `json:"date"`    // Какая дата (YYYY-MM-DD)
	Balance float64 `json:"balance"` // Какой прогнозный остаток денег на счету в этот день
}

// PredictResponse описывает структуру ответа, который прилетает из Python обратно в Go
type PredictResponse struct {
	Points []Point `json:"points"`
}

// TelegramWebhookRequest описывает базовую структуру входящего сообщения от Telegram
type TelegramWebhookRequest struct {
	UpdateID int `json:"update_id"`
	Message  *struct {
		MessageID int `json:"message_id"`
		Chat      struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
}
