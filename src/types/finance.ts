export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrenceType = 'ONCE' | 'RECURRING';
export type RecurrenceInterval = 'MONTH' | 'YEAR' | 'WEEK' | 'BIWEEKLY' | 'CUSTOM_DAYS';
export type RuleSource = 'MANUAL' | 'API_JSON' | 'FILE_IMPORT' | 'TELEGRAM' | 'GOOGLE_CALENDAR';

export type CounterpartyType = 'CLIENT' | 'VENDOR' | 'BANK' | 'TAX' | 'INTERNAL';

export interface Counterparty {
  id: string;
  name: string;
  inn?: string;
  type: CounterpartyType;
  defaultCategory?: string;
  contract?: string;
  accountNumber?: string;
}

export interface TransactionRule {
  id: string;
  title: string;
  amount: number; // в форме всегда плюс, минус ставится при расчете
  type: TransactionType;
  recurrence: RecurrenceType;
  category: string;
  source: RuleSource;
  // поля для контрагента и счета
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  accountName?: string;
  // если разовая
  date?: string;
  // если циклическая
  intervalType?: RecurrenceInterval;
  customIntervalDays?: number; // кол-во дней для произвольного периода
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
}

export interface EnrichedTransaction {
  ruleId: string;
  title: string;
  amount: number;
  signedAmount: number;
  type: TransactionType;
  category: string;
  source: RuleSource;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  accountName?: string;
  recurrence?: RecurrenceType;
  intervalType?: RecurrenceInterval;
  customIntervalDays?: number;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
}

export interface DailyPoint {
  dayIndex: number;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  openingBalance: number;
  closingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  netChange: number;
  transactions: EnrichedTransaction[];
  isCashGap: boolean;
  gapDeficit: number;
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
  daysUntilGap: number | null;
  firstGapDate: string | null;
  maxDeficit: number;
  gapDurationDays: number;
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
  organizationName?: string;
  initialBalance: number;
  startDate: string;
  period: 30 | 60 | 90 | 180;
  safetyBuffer: number;
  autoTodayStart: boolean;
  currency: string;
  updatedAt: string;
  enableChartCollapse?: boolean;
  showCompactTooltip?: boolean;
}
