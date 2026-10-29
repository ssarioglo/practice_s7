export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceType = 'ONCE' | 'RECURRING';
export type RuleSource = 'MANUAL' | 'TELEGRAM' | 'GOOGLE_CALENDAR';

export interface TransactionRule {
  id: string;
  title: string;
  amount: number; // positive number in UI, inverted to negative for expenses when communicating with engine
  type: TransactionType;
  recurrence: RecurrenceType;
  category: string;
  source: RuleSource;
  // For ONCE:
  date?: string; // YYYY-MM-DD
  // For RECURRING:
  dayOfMonth?: number; // 1-31
  startDate?: string; // YYYY-MM-DD (optional recurrence start date)
  endDate?: string; // YYYY-MM-DD (e.g. loan payoff date)
  active: boolean;
}

export interface EnrichedTransaction {
  ruleId: string;
  title: string;
  amount: number;
  signedAmount: number; // positive for income, negative for expense
  type: TransactionType;
  category: string;
  source: RuleSource;
  recurrence?: RecurrenceType;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
}

export interface DailyPoint {
  dayIndex: number;
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g., "12 нояб."
  dayOfWeek: string; // "Пн", "Вт", ...
  openingBalance: number;
  closingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  netChange: number;
  transactions: EnrichedTransaction[];
  isCashGap: boolean; // closingBalance < 0
  gapDeficit: number; // Math.abs(closingBalance) if < 0 else 0
}

export interface ForecastSummary {
  periodDays: number;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  netCashFlow: number;
  minBalance: number;
  minBalanceDate: string | null;
  maxBalance: number;
  maxBalanceDate: string | null;
  totalIncome: number;
  totalExpense: number;
  hasCashGap: boolean;
  daysUntilGap: number | null; // number of days from start until first cash gap, or null
  firstGapDate: string | null;
  maxDeficit: number; // worst deficit during period
  gapDurationDays: number; // total days below 0
}

export interface ForecastResult {
  points: DailyPoint[];
  summary: ForecastSummary;
}

export interface ForecastConfig {
  initialBalance: number;
  startDate: string;
  period: 30 | 60 | 90 | 180;
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  initialBalance: number;
  startDate: string;
  period: 30 | 60 | 90 | 180;
  safetyBuffer: number;
  autoTodayStart: boolean;
  currency: string;
  updatedAt: string;
  // Chart Display Settings
  enableChartCollapse?: boolean;
  showCompactTooltip?: boolean;
}
