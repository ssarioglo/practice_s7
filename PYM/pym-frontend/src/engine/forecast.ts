import {
  DailyPoint,
  EnrichedTransaction,
  ForecastConfig,
  ForecastResult,
  ForecastSummary,
  TransactionRule,
} from '../types/finance.ts';

/**
 * Returns number of days in the month for a given year and month (1-indexed: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats a Date object to YYYY-MM-DD in local representation.
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date string into short Russian readable label e.g. "24 окт"
 */
export function formatReadableDateRu(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  const monthNames = [
    'янв', 'февр', 'март', 'апр', 'май', 'июн',
    'июл', 'авг', 'сент', 'окт', 'нояб', 'дек'
  ];
  return `${day} ${monthNames[month - 1] || ''}`;
}

const RU_WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Core predictor engine: simulates daily cash flow matrix for 30–180 days.
 * Equivalent to Python Predictor-service (port 9802) unfolding logic with Go data enrichment.
 */
export function runCashFlowForecast(
  config: ForecastConfig,
  rules: TransactionRule[]
): ForecastResult {
  const { initialBalance, startDate, period } = config;
  const activeRules = rules.filter((r) => r.active !== false);

  const start = new Date(startDate + 'T00:00:00');
  const points: DailyPoint[] = [];

  let currentBalance = initialBalance;
  let totalIncome = 0;
  let totalExpense = 0;
  let minBalance = initialBalance;
  let minBalanceDate: string | null = null;
  let maxBalance = initialBalance;
  let maxBalanceDate: string | null = null;

  let firstGapIndex: number | null = null;
  let firstGapDate: string | null = null;
  let gapDurationDays = 0;
  let maxDeficit = 0;

  for (let i = 0; i < period; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);

    const dateISO = formatDateISO(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1..12
    const dayOfMonth = currentDate.getDate();
    const daysInThisMonth = getDaysInMonth(year, month);
    const dayOfWeek = RU_WEEKDAYS[currentDate.getDay()];

    const openingBalance = currentBalance;
    const dailyTransactions: EnrichedTransaction[] = [];
    let dayIncome = 0;
    let dayExpense = 0;

    for (const rule of activeRules) {
      let isTriggered = false;

      if (rule.recurrence === 'ONCE') {
        if (rule.date === dateISO) {
          isTriggered = true;
        }
      } else if (rule.recurrence === 'RECURRING') {
        // Check start_date and end_date bounds
        if (rule.startDate && dateISO < rule.startDate) {
          isTriggered = false;
        } else if (rule.endDate && dateISO > rule.endDate) {
          isTriggered = false;
        } else {
          const targetDay = rule.dayOfMonth || 1;
          // Clamp targetDay if month has fewer days (e.g. 31st on April 30 or Feb 28)
          const effectiveDay = Math.min(targetDay, daysInThisMonth);
          if (dayOfMonth === effectiveDay) {
            isTriggered = true;
          }
        }
      }

      if (isTriggered) {
        const positiveAmount = Math.abs(rule.amount);
        const signedAmount = rule.type === 'INCOME' ? positiveAmount : -positiveAmount;

        if (rule.type === 'INCOME') {
          dayIncome += positiveAmount;
        } else {
          dayExpense += positiveAmount;
        }

        dailyTransactions.push({
          ruleId: rule.id,
          title: rule.title,
          amount: positiveAmount,
          signedAmount,
          type: rule.type,
          category: rule.category,
          source: rule.source,
          recurrence: rule.recurrence,
          dayOfMonth: rule.dayOfMonth,
          startDate: rule.startDate,
          endDate: rule.endDate,
        });
      }
    }

    const netChange = dayIncome - dayExpense;
    const closingBalance = openingBalance + netChange;
    currentBalance = closingBalance;

    totalIncome += dayIncome;
    totalExpense += dayExpense;

    if (closingBalance < minBalance || minBalanceDate === null) {
      minBalance = closingBalance;
      minBalanceDate = dateISO;
    }
    if (closingBalance > maxBalance || maxBalanceDate === null) {
      maxBalance = closingBalance;
      maxBalanceDate = dateISO;
    }

    const isCashGap = closingBalance < 0;
    const gapDeficit = isCashGap ? Math.abs(closingBalance) : 0;

    if (isCashGap) {
      gapDurationDays++;
      if (gapDeficit > maxDeficit) {
        maxDeficit = gapDeficit;
      }
      if (firstGapIndex === null) {
        firstGapIndex = i;
        firstGapDate = dateISO;
      }
    }

    points.push({
      dayIndex: i,
      date: dateISO,
      formattedDate: formatReadableDateRu(dateISO),
      dayOfWeek,
      openingBalance,
      closingBalance,
      incomeTotal: dayIncome,
      expenseTotal: dayExpense,
      netChange,
      transactions: dailyTransactions,
      isCashGap,
      gapDeficit,
    });
  }

  const finalBalance = currentBalance;
  const netCashFlow = finalBalance - initialBalance;

  const summary: ForecastSummary = {
    periodDays: period,
    startDate,
    endDate: points[points.length - 1]?.date || startDate,
    initialBalance,
    finalBalance,
    netCashFlow,
    minBalance,
    minBalanceDate,
    maxBalance,
    maxBalanceDate,
    totalIncome,
    totalExpense,
    hasCashGap: firstGapIndex !== null,
    daysUntilGap: firstGapIndex !== null ? firstGapIndex : null,
    firstGapDate,
    maxDeficit,
    gapDurationDays,
  };

  return { points, summary };
}
