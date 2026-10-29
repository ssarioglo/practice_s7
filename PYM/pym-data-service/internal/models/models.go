package models

import "time"

type User struct {
	ID            int       `json:"id"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"password_hash"`
	WebhookSecret *string   `json:"webhook_secret"`
	CreatedAt     time.Time `json:"created_at"`
}

type UserProfileDTO struct {
	UserID         int     `json:"userId"`
	FullName       string  `json:"fullName"`
	InitialBalance float64 `json:"initialBalance"`
	StartDate      string  `json:"startDate"`
	Period         int     `json:"period"`
}

type CounterpartyDTO struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Inn           *string `json:"inn,omitempty"`
	Type          string  `json:"type"`
	Contract      *string `json:"contract,omitempty"`
	AccountNumber *string `json:"accountNumber,omitempty"`
}

type TransactionRuleDTO struct {
	ID                 string  `json:"id"`
	UserID             int     `json:"userId,omitempty"`
	Title              string  `json:"title"`
	Amount             float64 `json:"amount"`
	Type               string  `json:"type"`               // "INCOME" | "EXPENSE"
	Recurrence         string  `json:"recurrence"`         // "ONCE" | "RECURRING"
	IntervalType       *string `json:"intervalType,omitempty"`
	CustomIntervalDays *int    `json:"customIntervalDays,omitempty"`
	DayOfMonth         *int    `json:"dayOfMonth,omitempty"`
	Date               *string `json:"date,omitempty"`
	StartDate          *string `json:"startDate,omitempty"`
	EndDate            *string `json:"endDate,omitempty"`
	Category           string  `json:"category"`
	Source             string  `json:"source"`
	AccountName        *string `json:"accountName,omitempty"`
	CounterpartyID     *string `json:"counterpartyId,omitempty"`
	CounterpartyName   *string `json:"counterpartyName,omitempty"`
	CounterpartyInn    *string `json:"counterpartyInn,omitempty"`
	Active             bool    `json:"active"`
}

type StateResponse struct {
	Profile        UserProfileDTO       `json:"profile"`
	Counterparties []CounterpartyDTO    `json:"counterparties"`
	Rules          []TransactionRuleDTO `json:"rules"`
}

type ImportPayload struct {
	Counterparties []CounterpartyDTO    `json:"counterparties"`
	Rules          []TransactionRuleDTO `json:"rules"`
}

type FinanceRule struct {
	ID                 int     `json:"id"`
	UserID             int     `json:"user_id"`
	Title              string  `json:"title"`
	Amount             float64 `json:"amount"`
	RuleType           string  `json:"rule_type"`
	IntervalType       *string `json:"interval_type,omitempty"`
	CustomIntervalDays *int    `json:"custom_interval_days,omitempty"`
	CategoryType       string  `json:"category_type"`
	StartDate          string  `json:"start_date"`
	EndDate            *string `json:"end_date"`
	DayOfMonth         *int    `json:"day_of_month"`
	ExternalID         *string `json:"external_id"`
	Active             bool    `json:"active"`
}

type PredictRequest struct {
	CurrentBalance float64       `json:"current_balance"`
	StartDate      string        `json:"start_date"`
	PeriodDays     int           `json:"period_days"`
	Rules          []FinanceRule `json:"rules"`
}

type Point struct {
	Date    string  `json:"date"`
	Balance float64 `json:"balance"`
}

type PredictResponse struct {
	Points []Point `json:"points"`
}

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
