import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DailyPoint, TransactionRule, TransactionType, EnrichedTransaction } from '../types/finance.ts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  Plus,
  Search,
  Calendar as CalendarIcon,
  AlertTriangle,
  ListFilter,
  Repeat,
} from 'lucide-react';

interface CalendarLedgerProps {
  points: DailyPoint[];
  rules: TransactionRule[];
  onDeleteRule: (ruleId: string) => void;
  onEditRule: (rule: TransactionRule) => void;
  onAddRuleAtDate: (date: string, type?: TransactionType) => void;
  hoveredPoint: DailyPoint | null;
  onHoverPointChange: (point: DailyPoint | null) => void;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  safetyBuffer?: number;
  forecastStartDate?: string;
  forecastEndDate?: string;
  scrollTrigger?: number;
}

// Helper to format category for column display
const formatCategory = (cat?: string): string => {
  if (!cat) return '—';
  const upper = cat.toUpperCase();
  if (upper === 'COMMON') return 'Основное';
  if (upper === 'CREDIT') return 'Кредит';
  if (upper === 'BUSINESS') return 'Бизнес';
  if (upper === 'LIVING') return 'Быт';
  return cat;
};

interface GroupedDayData {
  date: string;
  dayIndex: number;
  formattedDate: string;
  dayOfWeek: string;
  openingBalance: number;
  closingBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  netChange: number;
  isCashGap: boolean;
  sortedTransactions: EnrichedTransaction[];
}

export const CalendarLedger: React.FC<CalendarLedgerProps> = ({
  points,
  rules,
  onDeleteRule,
  onEditRule,
  onAddRuleAtDate,
  hoveredPoint,
  onHoverPointChange,
  selectedDate,
  onSelectDate,
  safetyBuffer = 20000,
  forecastStartDate,
  forecastEndDate,
  scrollTrigger,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [showOnlyWithOperations, setShowOnlyWithOperations] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Map rules by ID for quick lookup when editing or getting recurrence info
  const rulesMap = useMemo(() => {
    const map = new Map<string, TransactionRule>();
    rules.forEach((r) => map.set(r.id, r));
    return map;
  }, [rules]);

  // Group and sort days:
  // 1. Multiple transactions on the same date are grouped together
  // 2. Grouped by type: INCOME first, EXPENSE second
  // 3. Alphabetically sorted inside each group
  const groupedDays = useMemo(() => {
    return points
      .map((pt) => {
        const sorted = [...pt.transactions].sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'INCOME' ? -1 : 1;
          }
          return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' });
        });

        return {
          date: pt.date,
          dayIndex: pt.dayIndex,
          formattedDate: pt.formattedDate,
          dayOfWeek: pt.dayOfWeek,
          openingBalance: pt.openingBalance,
          closingBalance: pt.closingBalance,
          incomeTotal: pt.incomeTotal,
          expenseTotal: pt.expenseTotal,
          netChange: pt.netChange,
          isCashGap: pt.isCashGap,
          sortedTransactions: sorted,
        } as GroupedDayData;
      })
      .filter((day) => {
        if (showOnlyWithOperations && day.sortedTransactions.length === 0) {
          return false;
        }

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesDate = day.date.includes(term) || day.formattedDate.toLowerCase().includes(term);
          const matchesTx = day.sortedTransactions.some((tx) =>
            tx.title.toLowerCase().includes(term) || tx.category.toLowerCase().includes(term)
          );
          if (!matchesDate && !matchesTx) return false;
        }

        if (typeFilter !== 'ALL') {
          if (day.sortedTransactions.length === 0) return false;
          const hasMatchingTx = day.sortedTransactions.some((tx) => tx.type === typeFilter);
          if (!hasMatchingTx) return false;
        }

        return true;
      });
  }, [points, showOnlyWithOperations, searchTerm, typeFilter]);

  // Dedicated vertical scroll container ref for the table
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<{ [date: string]: HTMLTableRowElement | null }>({});

  useEffect(() => {
    if (!selectedDate) return;
    const rowEl = rowRefs.current[selectedDate];
    const container = tableScrollRef.current;
    if (!rowEl || !container) return;

    const rowOffsetTop = rowEl.offsetTop;
    const rowHeight = rowEl.offsetHeight;
    const containerHeight = container.clientHeight;
    const currentScrollTop = container.scrollTop;

    // Position of row relative to current visible viewport inside table
    const rowTopRelative = rowOffsetTop - currentScrollTop;
    const rowBottomRelative = rowTopRelative + rowHeight;
    const centerY = containerHeight / 2;

    // Case 1: If row is already fully visible in the lower half of the frame (from center to bottom)
    // -> Do not scroll, just select/highlight
    if (rowTopRelative >= centerY - 8 && rowBottomRelative <= containerHeight - 8) {
      return;
    }

    // Case 2: If partially clipped at bottom boundary -> pull into view smoothly
    if (rowTopRelative < containerHeight && rowBottomRelative > containerHeight) {
      container.scrollTo({
        top: currentScrollTop + (rowBottomRelative - containerHeight) + 16,
        behavior: 'smooth',
      });
      return;
    }

    // Case 2b: If partially clipped at top boundary (under sticky thead) -> pull into view smoothly
    if (rowBottomRelative > 34 && rowTopRelative < 34) {
      container.scrollTo({
        top: Math.max(0, currentScrollTop + (rowTopRelative - 38)),
        behavior: 'smooth',
      });
      return;
    }

    // Case 3: Center the row vertically in the table container
    const targetScrollTop = rowOffsetTop - (containerHeight / 2) + (rowHeight / 2);
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }, [selectedDate, scrollTrigger]);

  const handleEditClick = (ruleId: string) => {
    const targetRule = rulesMap.get(ruleId);
    if (targetRule) {
      onEditRule(targetRule);
    }
  };

  const handleDeleteClick = (ruleId: string) => {
    setDeleteConfirmId(ruleId);
  };

  const confirmDelete = (ruleId: string) => {
    onDeleteRule(ruleId);
    setDeleteConfirmId(null);
  };

  // Summary statistics for active filtered rows
  const stats = useMemo(() => {
    let totalIncomesCount = 0;
    let totalExpensesCount = 0;
    let totalIncomeSum = 0;
    let totalExpenseSum = 0;

    groupedDays.forEach((day) => {
      day.sortedTransactions.forEach((tx) => {
        if (tx.type === 'INCOME') {
          totalIncomesCount++;
          totalIncomeSum += tx.amount;
        } else {
          totalExpensesCount++;
          totalExpenseSum += tx.amount;
        }
      });
    });

    const lastDay = points.length > 0 ? points[points.length - 1] : null;
    return {
      totalIncomesCount,
      totalExpensesCount,
      totalIncomeSum,
      totalExpenseSum,
      closingBalance: lastDay ? lastDay.closingBalance : 0,
    };
  }, [groupedDays, points]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* 1. Integrated Header Toolbar (Search, Type Filters, Mode Toggle, Add Button) */}
      <div className="p-2.5 sm:p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 bg-white text-xs">
        {/* Search & Type filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative min-w-[170px] flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или категории..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 font-medium shrink-0">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2 py-1 rounded-md transition cursor-pointer text-xs ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setTypeFilter('INCOME')}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 text-xs ${
                typeFilter === 'INCOME'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Доходы
            </button>
            <button
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 text-xs ${
                typeFilter === 'EXPENSE'
                  ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
              Расходы
            </button>
          </div>

          {/* Toggle Idle Days */}
          <button
            onClick={() => setShowOnlyWithOperations(!showOnlyWithOperations)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 text-xs ${
              showOnlyWithOperations
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Переключить показ только дат с транзакциями"
          >
            <ListFilter size={13} />
            <span>{showOnlyWithOperations ? 'Только с операциями' : 'Все даты'}</span>
          </button>
        </div>

        {/* Action button to add a new rule */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => onAddRuleAtDate(selectedDate || forecastStartDate || '2026-10-24')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs transition cursor-pointer text-xs"
          >
            <Plus size={14} />
            <span>Новая операция</span>
          </button>
        </div>
      </div>

      {/* 2. Integrated KPI Summary Strip (clean inline metrics, no duplicate "Период в таблице") */}
      <div className="px-3.5 py-1.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Доходы:</span>
            <span className="font-mono font-bold text-emerald-600">
              +{stats.totalIncomeSum.toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-slate-400 text-[11px]">({stats.totalIncomesCount})</span>
          </div>
          <div className="h-3 w-px bg-slate-300"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Расходы:</span>
            <span className="font-mono font-bold text-rose-600">
              -{stats.totalExpenseSum.toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-slate-400 text-[11px]">({stats.totalExpensesCount})</span>
          </div>
          <div className="h-3 w-px bg-slate-300"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Итоговый остаток:</span>
            <span
              className={`font-mono font-bold ${
                stats.closingBalance < 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              {stats.closingBalance.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium ml-auto">
          Показано: <strong className="text-slate-700">{groupedDays.length}</strong>{' '}
          {showOnlyWithOperations ? 'дней с операциями' : 'календарных дней'}
        </div>
      </div>

      {/* 3. Dedicated Scrollable Table with Sticky Column Headers */}
      <div ref={tableScrollRef} className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-[130px] whitespace-nowrap bg-slate-100">Дата</th>
              <th className="py-2.5 px-3.5 min-w-[150px] bg-slate-100">Название</th>
              <th className="py-2.5 px-2.5 w-[95px] whitespace-nowrap bg-slate-100">Категория</th>
              <th className="py-2.5 px-3 w-[125px] whitespace-nowrap bg-slate-100">Сумма</th>
              <th className="py-2.5 px-3 w-[115px] whitespace-nowrap bg-slate-100">Остаток</th>
              <th className="py-2.5 px-3 w-[75px] text-right whitespace-nowrap bg-slate-100">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
              {groupedDays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CalendarIcon size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Нет операций по выбранным критериям</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Попробуйте сбросить фильтры или добавить новую операцию
                    </p>
                  </td>
                </tr>
              ) : (
                groupedDays.map((day) => {
                  const txCount = day.sortedTransactions.length;
                  const isHovered = hoveredPoint?.date === day.date;
                  const isSelected = selectedDate === day.date;
                  const isLowBalance = day.closingBalance < safetyBuffer && day.closingBalance >= 0;
                  const isNegativeBalance = day.closingBalance < 0;

                  // Zero-transaction day (when showOnlyWithOperations is false)
                  if (txCount === 0) {
                    return (
                      <tr
                        key={day.date}
                        ref={(el) => {
                          rowRefs.current[day.date] = el;
                        }}
                        onMouseEnter={() => {
                          const pt = points.find((p) => p.date === day.date) || null;
                          onHoverPointChange(pt);
                        }}
                        onMouseLeave={() => onHoverPointChange(null)}
                        onClick={() => onSelectDate(day.date)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                            : isHovered
                            ? 'bg-slate-50/80'
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* 1. ДАТА (чистая плашка, как отмечено на скриншоте) */}
                        <td className="py-2 px-3 whitespace-nowrap w-[130px]">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs whitespace-nowrap">
                            {day.date} ({day.dayOfWeek})
                          </span>
                        </td>
                        {/* 2. НАЗВАНИЕ */}
                        <td className="py-2 px-3.5 text-slate-400 italic">Нет операций в этот день</td>
                        {/* 3. КАТЕГОРИЯ */}
                        <td className="py-2 px-2.5 text-slate-300 whitespace-nowrap">—</td>
                        {/* 4. СУММА */}
                        <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">—</td>
                        {/* 5. ОСТАТОК */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono">
                          <span
                            className={
                              isNegativeBalance
                                ? 'text-rose-600 font-bold'
                                : isLowBalance
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-700'
                            }
                          >
                            {day.closingBalance.toLocaleString('ru-RU')} ₽
                          </span>
                        </td>
                        {/* 6. ДЕЙСТВИЯ */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddRuleAtDate(day.date);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title={`Добавить операцию на ${day.date}`}
                          >
                            <Plus size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Day with one or more transactions
                  return day.sortedTransactions.map((tx, idx) => {
                    const isFirstTxOfDay = idx === 0;
                    const isIncome = tx.type === 'INCOME';
                    const rule = rulesMap.get(tx.ruleId);
                    const isRuleKnown = Boolean(rule);

                    const isRecurring = (tx.recurrence || rule?.recurrence) === 'RECURRING';
                    const endDate = tx.endDate || rule?.endDate;
                    const dayOfMonth = tx.dayOfMonth || rule?.dayOfMonth;

                    // Tooltip text for recurrence icon
                    const recurrenceTooltip = isRecurring
                      ? endDate
                        ? `Циклический, дата окончания ${endDate}${dayOfMonth ? ` (${dayOfMonth}-го числа)` : ''}`
                        : `Циклический, бессрочно${dayOfMonth ? ` (${dayOfMonth}-го числа)` : ''}`
                      : `Разовый (${day.date})`;

                    return (
                      <tr
                        key={`${day.date}-${tx.ruleId}-${idx}`}
                        ref={(el) => {
                          if (isFirstTxOfDay) {
                            rowRefs.current[day.date] = el;
                          }
                        }}
                        onMouseEnter={() => {
                          const pt = points.find((p) => p.date === day.date) || null;
                          onHoverPointChange(pt);
                        }}
                        onMouseLeave={() => onHoverPointChange(null)}
                        onClick={() => onSelectDate(day.date)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                            : isHovered
                            ? 'bg-slate-50/90'
                            : isFirstTxOfDay && txCount > 1
                            ? 'border-t-2 border-slate-200/80 hover:bg-slate-50/60'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* 1. Столбец: ДАТА (Строго на первом месте, чистая плашка без иконки) */}
                        {isFirstTxOfDay && (
                          <td
                            rowSpan={txCount}
                            className={`py-2.5 px-3 align-top whitespace-nowrap w-[130px] min-w-[130px] ${
                              txCount > 1 ? 'bg-slate-50/40' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-1 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs whitespace-nowrap w-fit">
                                {day.date} ({day.dayOfWeek})
                              </span>
                              {txCount > 1 && (
                                <span className="text-[10px] text-slate-400 pl-0.5 whitespace-nowrap">
                                  {txCount} операции(-й)
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* 2. Столбец: НАЗВАНИЕ с иконкой периодичности (обычный курсор) */}
                        <td className="py-2.5 px-3.5 font-normal text-slate-800">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Иконка периодичности (без cursor-help, курсор не меняется на ?) */}
                            <span
                              title={recurrenceTooltip}
                              className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-default"
                            >
                              {isRecurring ? (
                                <Repeat size={13} className="text-blue-500 hover:text-blue-600" />
                              ) : (
                                <svg
                                  viewBox="0 0 24 24"
                                  className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="9" />
                                  <line x1="12" y1="7" x2="12" y2="17" />
                                </svg>
                              )}
                            </span>

                            {/* Название операции */}
                            <span className="text-slate-800 truncate" title={tx.title}>
                              {tx.title}
                            </span>
                          </div>
                        </td>

                        {/* 3. Столбец: КАТЕГОРИЯ (после названия) */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap w-[95px]">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                              tx.category?.toUpperCase() === 'CREDIT'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                : tx.category?.toUpperCase() === 'BUSINESS'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                                : tx.category?.toUpperCase() === 'LIVING'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200/80'
                                : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                            }`}
                          >
                            {formatCategory(tx.category)}
                          </span>
                        </td>

                        {/* 4. Столбец: СУММА */}
                        <td className="py-2.5 px-3 whitespace-nowrap w-[125px]">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs whitespace-nowrap ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/70 font-semibold'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight size={13} className="shrink-0 text-emerald-600" />
                            ) : (
                              <ArrowDownRight size={13} className="shrink-0 text-rose-600" />
                            )}
                            <span>
                              {isIncome ? '+' : '-'} {tx.amount.toLocaleString('ru-RU')} ₽
                            </span>
                          </span>
                        </td>

                        {/* 5. Столбец: ОСТАТОК */}
                        {isFirstTxOfDay ? (
                          <td
                            rowSpan={txCount}
                            className={`py-2.5 px-3 align-top font-mono border-l border-slate-100 whitespace-nowrap w-[115px] ${
                              txCount > 1 ? 'bg-slate-50/30' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-0.5 whitespace-nowrap">
                              <span
                                className={`text-sm tracking-tight ${
                                  isNegativeBalance
                                    ? 'text-rose-600 font-bold'
                                    : isLowBalance
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-800 font-semibold'
                                }`}
                              >
                                {day.closingBalance.toLocaleString('ru-RU')} ₽
                              </span>
                              {isNegativeBalance ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded w-fit whitespace-nowrap">
                                  <AlertTriangle size={10} /> Разрыв!
                                </span>
                              ) : isLowBalance ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded w-fit whitespace-nowrap">
                                  Ниже буфера
                                </span>
                              ) : null}
                            </div>
                          </td>
                        ) : null}

                        {/* 6. Столбец: ДЕЙСТВИЯ */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap w-[75px]">
                          <div className="inline-flex items-center gap-1 justify-end whitespace-nowrap">
                            {/* Очистить / удалить строку */}
                            {deleteConfirmId === tx.ruleId ? (
                              <div
                                className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-md whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[10px] text-rose-700 font-bold px-1">Удалить?</span>
                                <button
                                  onClick={() => confirmDelete(tx.ruleId)}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Да
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                                >
                                  Нет
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(tx.ruleId);
                                }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Очистить строку / Удалить операцию"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            {/* Редактировать */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(tx.ruleId);
                              }}
                              disabled={!isRuleKnown}
                              className={`p-1.5 rounded-md transition cursor-pointer ${
                                isRuleKnown
                                  ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                  : 'text-slate-300 cursor-not-allowed'
                              }`}
                              title={isRuleKnown ? 'Отредактировать правило / операцию' : 'Системное правило'}
                            >
                              <Pencil size={14} />
                            </button>

                            {/* Добавить правило на эту дату */}
                            {isFirstTxOfDay && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddRuleAtDate(day.date);
                                }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                title={`Добавить новую операцию на ${day.date}`}
                              >
                                <Plus size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
