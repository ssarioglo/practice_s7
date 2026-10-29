import {
  DailyPoint,
  EnrichedTransaction,
  ForecastConfig,
  ForecastResult,
  ForecastSummary,
  TransactionRule,
} from '../types/finance.ts';

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatReadableDateRu(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  const monthNames = [
    'янв', 'февр', 'март', 'апр', 'май', 'июн',
    'июл', 'авг', 'сент', 'окт', 'нояб', 'дек',
  ];
  return `${day} ${monthNames[month - 1] || ''}`;
}

// разница в днях между двумя датами
export function diffCalendarDaysISO(dateA: string, dateB: string): number {
  const [yA, mA, dA] = dateA.split('-').map(Number);
  const [yB, mB, dB] = dateB.split('-').map(Number);
  const utcA = Date.UTC(yA, (mA || 1) - 1, dA || 1);
  const utcB = Date.UTC(yB, (mB || 1) - 1, dB || 1);
  return Math.round((utcB - utcA) / 86400000);
}

// проверка ушло ли правило в архив (если дата меньше даты старта)
export function isRuleArchived(rule: TransactionRule, forecastStartDate: string): boolean {
  if (!forecastStartDate) return false;
  if (rule.recurrence === 'ONCE') {
    return Boolean(rule.date && rule.date < forecastStartDate);
  }
  if (rule.recurrence === 'RECURRING') {
    return Boolean(rule.endDate && rule.endDate < forecastStartDate);
  }
  return false;
}

// текст для колонки периодичности в таблице
export function formatRecurrenceLabel(rule: TransactionRule): string {
  if (rule.recurrence === 'ONCE') {
    return `Разово: ${rule.date || '—'}`;
  }
  const interval = rule.intervalType || 'MONTH';
  switch (interval) {
    case 'MONTH':
      return `Раз в месяц (${rule.dayOfMonth || 1}-е число)`;
    case 'YEAR': {
      const anchor = rule.startDate ? formatReadableDateRu(rule.startDate) : 'ежегодно';
      return `Раз в год (${anchor})`;
    }
    case 'WEEK':
      return 'Раз в неделю (7 дн.)';
    case 'BIWEEKLY':
      return 'Раз в 2 недели (14 дн.)';
    case 'CUSTOM_DAYS':
      return `Раз в ${rule.customIntervalDays || 2} дн.`;
    default:
      return `Раз в месяц (${rule.dayOfMonth || 1}-е число)`;
  }
}

export function formatCategoryLabel(cat?: string): string {
  if (!cat) return 'Операционная';
  const upper = cat.toUpperCase();
  switch (upper) {
    case 'OPERATIONAL':
    case 'COMMON':
      return 'Операционная';
    case 'INVESTMENT':
      return 'Инвестиционная';
    case 'FINANCIAL':
    case 'CREDIT':
      return 'Финансовая';
    case 'TAX':
    case 'BUSINESS':
      return 'Налоги и сборы';
    case 'PAYROLL':
      return 'ФОТ (Зарплата)';
    default:
      return cat;
  }
}

const RU_WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// основной расчет прогноза по дням
export function runCashFlowForecast(
  config: ForecastConfig,
  rules: TransactionRule[]
): ForecastResult {
  const { initialBalance, startDate, period } = config;
  const safeRules = Array.isArray(rules) ? rules : [];
  // архивные и выключенные не берем
  const activeRules = safeRules.filter(
    (r) => r.active !== false && !isRuleArchived(r, startDate)
  );

  const start = new Date(startDate + 'T00:00:00');
  const points: DailyPoint[] = [];

  let currentBalance = initialBalance;
  let totalIncome = 0;
  let totalExpense = 0;
  let minBalance = initialBalance;
  let minBalanceDate: string | null = startDate;
  let maxBalance = initialBalance;
  let maxBalanceDate: string | null = startDate;

  let firstGapIndex: number | null = null;
  let firstGapDate: string | null = null;
  let gapDurationDays = 0;
  let maxDeficit = 0;

  for (let i = 0; i < period; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);

    const dateISO = formatDateISO(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
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
        if (rule.startDate && dateISO < rule.startDate) {
          isTriggered = false;
        } else if (rule.endDate && dateISO > rule.endDate) {
          isTriggered = false;
        } else {
          const interval = rule.intervalType || 'MONTH';

          if (interval === 'MONTH') {
            const targetDay = rule.dayOfMonth || 1;
            const effectiveDay = Math.min(targetDay, daysInThisMonth);
            if (dayOfMonth === effectiveDay) {
              isTriggered = true;
            }
          } else if (interval === 'YEAR') {
            const anchorISO = rule.startDate || startDate;
            const parts = anchorISO.split('-').map(Number);
            const anchorMonth = parts[1] || 1;
            const anchorDay = parts[2] || 1;
            const effectiveAnchorDay = Math.min(anchorDay, daysInThisMonth);
            if (month === anchorMonth && dayOfMonth === effectiveAnchorDay) {
              isTriggered = true;
            }
          } else if (
            interval === 'WEEK' ||
            interval === 'BIWEEKLY' ||
            interval === 'CUSTOM_DAYS'
          ) {
            // считаем шаг в днях от даты начала
            const anchorISO = rule.startDate || startDate;
            const diffDays = diffCalendarDaysISO(anchorISO, dateISO);
            const step =
              interval === 'WEEK'
                ? 7
                : interval === 'BIWEEKLY'
                ? 14
                : Math.max(1, Math.round(rule.customIntervalDays || 2));
            if (diffDays >= 0 && diffDays % step === 0) {
              isTriggered = true;
            }
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
          counterpartyId: rule.counterpartyId,
          counterpartyName: rule.counterpartyName,
          counterpartyInn: rule.counterpartyInn,
          accountName: rule.accountName,
          recurrence: rule.recurrence,
          intervalType: rule.intervalType,
          customIntervalDays: rule.customIntervalDays,
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

    if (closingBalance < minBalance || i === 0) {
      minBalance = closingBalance;
      minBalanceDate = dateISO;
    }
    if (closingBalance > maxBalance || i === 0) {
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
