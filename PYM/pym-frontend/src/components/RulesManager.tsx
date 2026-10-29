import React, { useState, useEffect } from 'react';
import { TransactionRule, TransactionType, RecurrenceType, DailyPoint } from '../types/finance.ts';
import {
  Plus,
  Trash2,
  Calendar,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Pencil,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RulesManagerProps {
  rules: TransactionRule[];
  onAddRule: (rule: Omit<TransactionRule, 'id'>) => void;
  onUpdateRule?: (rule: TransactionRule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  activeHoverPoint?: DailyPoint | null;
  isOpenModal?: boolean;
  onOpenModalChange?: (open: boolean) => void;
  prefillData?: { date?: string; type?: TransactionType; title?: string } | null;
  hoveredRuleId?: string | null;
  onHoverRuleChange?: (ruleId: string | null) => void;
  defaultDate?: string;
  forecastStartDate?: string;
  forecastEndDate?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RulesManager: React.FC<RulesManagerProps> = ({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  activeHoverPoint,
  isOpenModal = false,
  onOpenModalChange,
  prefillData,
  hoveredRuleId,
  onHoverRuleChange,
  defaultDate = '2026-10-24',
  forecastStartDate,
  forecastEndDate,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [localModalOpen, setLocalModalOpen] = useState(false);
  const showModal = isOpenModal || localModalOpen;
  const setShowModal = (open: boolean) => {
    setLocalModalOpen(open);
    if (onOpenModalChange) onOpenModalChange(open);
    if (!open) {
      setEditingRule(null);
    }
  };

  const [editingRule, setEditingRule] = useState<TransactionRule | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('ONCE');
  const [category, setCategory] = useState('COMMON');
  const [date, setDate] = useState(() => defaultDate || '2026-10-24');
  const [dayOfMonth, setDayOfMonth] = useState(() => {
    const d = defaultDate ? parseInt(defaultDate.split('-')[2] || '24', 10) : 24;
    return String(d);
  });
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (prefillData && !editingRule) {
      if (prefillData.date) {
        setDate(prefillData.date);
        const day = parseInt(prefillData.date.split('-')[2] || '1', 10);
        setDayOfMonth(String(day));
        setRecurrence('ONCE');
      }
      if (prefillData.type) {
        setType(prefillData.type);
      }
      if (prefillData.title) {
        setTitle(prefillData.title);
      }
      setLocalModalOpen(true);
    }
  }, [prefillData, editingRule]);

  const handleOpenAddModal = () => {
    setEditingRule(null);
    setTitle('');
    setAmount('');
    setType('EXPENSE');
    setRecurrence('ONCE');
    setCategory('COMMON');
    const initialDate = defaultDate || '2026-10-24';
    setDate(initialDate);
    const day = parseInt(initialDate.split('-')[2] || '24', 10);
    setDayOfMonth(String(day));
    setEndDate('');
    setShowModal(true);
  };

  const handleStartEdit = (rule: TransactionRule) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setAmount(String(rule.amount));
    setType(rule.type);
    setRecurrence(rule.recurrence);
    setCategory(rule.category || 'COMMON');
    setDate(rule.date || new Date().toISOString().split('T')[0]);
    setDayOfMonth(String(rule.dayOfMonth || 10));
    setEndDate(rule.endDate || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    if (!title || parsedAmount <= 0) return;

    if (editingRule && onUpdateRule) {
      onUpdateRule({
        ...editingRule,
        title,
        amount: parsedAmount,
        type,
        recurrence,
        category,
        date: recurrence === 'ONCE' ? date : undefined,
        dayOfMonth: recurrence === 'RECURRING' ? parseInt(dayOfMonth, 10) : undefined,
        endDate: recurrence === 'RECURRING' && endDate ? endDate : undefined,
      });
    } else {
      onAddRule({
        title,
        amount: parsedAmount,
        type,
        recurrence,
        category,
        source: 'MANUAL',
        date: recurrence === 'ONCE' ? date : undefined,
        dayOfMonth: recurrence === 'RECURRING' ? parseInt(dayOfMonth, 10) : undefined,
        endDate: recurrence === 'RECURRING' && endDate ? endDate : undefined,
        active: true,
      });
    }

    setEditingRule(null);
    setTitle('');
    setAmount('');
    setShowModal(false);
  };

  // IDs of rules active on the currently hovered chart point
  const activeHoverRuleIds = React.useMemo(() => {
    if (!activeHoverPoint || !activeHoverPoint.transactions) return new Set<string>();
    return new Set(activeHoverPoint.transactions.map((tx) => tx.ruleId));
  }, [activeHoverPoint]);

  const hasChartHover = activeHoverRuleIds.size > 0;

  // Move rules active on the hovered chart point to the top of the list,
  // reverting to original ordering as soon as cursor leaves the chart
  const displayedRules = React.useMemo(() => {
    if (!hasChartHover) {
      return rules;
    }
    const matching: TransactionRule[] = [];
    const others: TransactionRule[] = [];
    for (const rule of rules) {
      if (activeHoverRuleIds.has(rule.id)) {
        matching.push(rule);
      } else {
        others.push(rule);
      }
    }
    return [...matching, ...others];
  }, [rules, hasChartHover, activeHoverRuleIds]);

  return (
    <div
      className={`bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden transition-all duration-200 ${
        !isCollapsed ? 'flex-1 flex flex-col min-h-0' : ''
      }`}
    >
      {/* Header */}
      <div
        onClick={onToggleCollapse}
        className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50 transition cursor-pointer select-none hover:bg-slate-100/90 shrink-0 ${
          isCollapsed ? 'border-b-0' : ''
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 text-slate-800">
            <h3 className="font-semibold text-sm sm:text-base">
              Финансовые правила и обязательства
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 font-mono text-slate-600 font-medium">
              {rules.length}
            </span>
          </div>

          {hasChartHover && activeHoverPoint && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">
              Выделены на {activeHoverPoint.date} (перемещены наверх)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm font-medium transition shadow-2xs cursor-pointer"
          >
            <Plus size={15} /> <span>Добавить</span>
          </button>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition cursor-pointer flex items-center gap-1 text-xs font-medium"
            title={isCollapsed ? 'Развернуть список правил' : 'Свернуть список правил'}
          >
            {isCollapsed ? (
              <>
                <ChevronDown size={15} className="text-slate-600" />
                <span className="hidden sm:inline">Развернуть</span>
              </>
            ) : (
              <>
                <ChevronUp size={15} className="text-slate-600" />
                <span className="hidden sm:inline">Свернуть</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rules Table with Dedicated Inner Scroll & Sticky Headers */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="w-12 pl-4 pr-2 py-2.5 text-center bg-slate-100">Статус</th>
                <th className="px-5 py-2.5 bg-slate-100">Название</th>
                <th className="px-5 py-2.5 bg-slate-100">Сумма</th>
                <th className="px-5 py-2.5 bg-slate-100">Периодичность / Дата</th>
                <th className="px-5 py-2.5 bg-slate-100">Категория</th>
                <th className="px-5 py-2.5 text-right bg-slate-100">Действия</th>
              </tr>
            </thead>
            <tbody
              className="divide-y divide-slate-100 font-sans"
              onMouseLeave={() => onHoverRuleChange?.(null)}
            >
            {displayedRules.map((rule) => {
              const isExpense = rule.type === 'EXPENSE';
              const isPointHovered = activeHoverRuleIds.has(rule.id);
              const isRuleHovered = hoveredRuleId === rule.id;

              // Fixed 4px left border prevents layout shift while providing strong color cues
              let rowStyle = 'border-l-4 transition-all duration-150 cursor-pointer ';

              if (hasChartHover) {
                if (isPointHovered) {
                  // Active on the hovered chart point: prominent, moved to top, distinct type color
                  if (isExpense) {
                    rowStyle += 'bg-rose-100/90 border-l-rose-600 font-medium text-slate-900 opacity-100 shadow-xs ring-1 ring-rose-300/70';
                  } else {
                    rowStyle += 'bg-emerald-100/90 border-l-emerald-600 font-medium text-slate-900 opacity-100 shadow-xs ring-1 ring-emerald-300/70';
                  }
                } else {
                  // Other rules are grayed out / dimmed
                  rowStyle += 'bg-slate-50/40 border-l-transparent opacity-25 grayscale text-slate-400 select-none';
                }
              } else {
                if (!rule.active) {
                  rowStyle += 'border-l-transparent opacity-40 bg-slate-50 text-slate-400';
                } else if (isRuleHovered) {
                  if (isExpense) {
                    rowStyle += 'bg-rose-100/80 border-l-rose-600 text-slate-900 shadow-2xs';
                  } else {
                    rowStyle += 'bg-emerald-100/80 border-l-emerald-600 text-slate-900 shadow-2xs';
                  }
                } else {
                  // Subtle tinted background for Income (green) and Expense (red)
                  if (isExpense) {
                    rowStyle += 'bg-rose-50/45 hover:bg-rose-50/80 border-l-rose-500 text-slate-800';
                  } else {
                    rowStyle += 'bg-emerald-50/45 hover:bg-emerald-50/80 border-l-emerald-500 text-slate-800';
                  }
                }
              }

              return (
                <tr
                  key={rule.id}
                  onMouseEnter={() => onHoverRuleChange?.(rule.id)}
                  className={rowStyle}
                >
                  <td className="w-12 pl-4 pr-2 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={rule.active}
                      onChange={() => onToggleRule(rule.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{rule.title}</span>
                      {rule.source !== 'MANUAL' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-normal">
                          {rule.source}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold">
                    <span className={`inline-flex items-center gap-1 font-mono ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isExpense ? <ArrowDownRight size={14} className="shrink-0" /> : <ArrowUpRight size={14} className="shrink-0" />}
                      {isExpense ? '-' : '+'}
                      {rule.amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {rule.recurrence === 'RECURRING' ? (
                      <div className="flex flex-col text-xs">
                        <span className="flex items-center gap-1 text-slate-800 font-medium">
                          <Repeat size={13} className="text-blue-500" />
                          Каждое {rule.dayOfMonth}-е число
                        </span>
                        {rule.endDate && (
                          <span className="text-[11px] text-slate-400">
                            до {rule.endDate} (сплит/кредит)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col text-xs">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Calendar size={13} className="text-amber-500" />
                          Разово: {rule.date}
                        </span>
                        {rule.date && ((forecastStartDate && rule.date < forecastStartDate) || (forecastEndDate && rule.date > forecastEndDate)) && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block w-fit">
                            ⚠️ вне периода графика ({forecastStartDate} – {forecastEndDate})
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white/70 border border-slate-200/60 text-slate-700 shadow-2xs">
                      <Tag size={11} />
                      {rule.category === 'CREDIT' ? 'Кредиты/Сплиты' : 'Обычное'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(rule)}
                        className="text-slate-400 hover:text-blue-600 transition p-1.5 rounded hover:bg-white/80 cursor-pointer"
                        title="Редактировать правило"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded hover:bg-white/80 cursor-pointer"
                        title="Удалить правило"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Modal dialog for adding or editing rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h4 className="font-semibold text-slate-800">
                {editingRule ? 'Редактирование правила' : 'Новое финансовое правило (PYM Rule)'}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Название транзакции / обязательства
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Аренда квартиры, Зарплата, Сплит Яндекс"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Сумма (₽)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="35000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Поток денег
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="EXPENSE">Расход (-)</option>
                    <option value="INCOME">Доход (+)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Тип правила
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ONCE">ONCE (Разовый)</option>
                    <option value="RECURRING">RECURRING (Циклический)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="COMMON">Обычное (COMMON)</option>
                    <option value="CREDIT">Кредит / Сплит (CREDIT)</option>
                  </select>
                </div>
              </div>

              {recurrence === 'ONCE' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Дата события (start_date)
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      День месяца (1-31)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Дата окончания (end_date)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Бессрочно"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Пусто = бесконечно</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition shadow-sm"
                >
                  {editingRule ? 'Сохранить изменения' : 'Сохранить в базу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
