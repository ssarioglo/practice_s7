import React, { useState, useEffect } from 'react';
import { TransactionRule, TransactionType, RecurrenceType } from '../types/finance.ts';
import { Plus, Pencil, X, Calendar, AlertCircle } from 'lucide-react';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (ruleData: Omit<TransactionRule, 'id'>, existingId?: string) => void;
  editingRule?: TransactionRule | null;
  prefillData?: {
    date?: string;
    type?: TransactionType;
    title?: string;
  } | null;
  defaultDate?: string;
  forecastStartDate?: string;
  forecastEndDate?: string;
}

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  editingRule = null,
  prefillData = null,
  defaultDate = '2026-10-24',
  forecastStartDate,
  forecastEndDate,
}) => {
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
  const [startDate, setStartDate] = useState('');

  // Sync state when modal opens or editingRule/prefillData changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingRule) {
      setTitle(editingRule.title);
      setAmount(String(editingRule.amount));
      setType(editingRule.type);
      setRecurrence(editingRule.recurrence);
      setCategory(editingRule.category || 'COMMON');
      setDate(editingRule.date || defaultDate || '2026-10-24');
      setDayOfMonth(String(editingRule.dayOfMonth || 10));
      setEndDate(editingRule.endDate || '');
      setStartDate(editingRule.startDate || '');
    } else if (prefillData) {
      setTitle(prefillData.title || '');
      setAmount('');
      setType(prefillData.type || 'EXPENSE');
      setRecurrence('ONCE');
      setCategory('COMMON');
      const targetDate = prefillData.date || defaultDate || '2026-10-24';
      setDate(targetDate);
      const day = parseInt(targetDate.split('-')[2] || '24', 10);
      setDayOfMonth(String(day));
      setEndDate('');
      setStartDate('');
    } else {
      setTitle('');
      setAmount('');
      setType('EXPENSE');
      setRecurrence('ONCE');
      setCategory('COMMON');
      const targetDate = defaultDate || '2026-10-24';
      setDate(targetDate);
      const day = parseInt(targetDate.split('-')[2] || '24', 10);
      setDayOfMonth(String(day));
      setEndDate('');
      setStartDate('');
    }
  }, [isOpen, editingRule, prefillData, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    if (!title.trim() || parsedAmount <= 0) return;

    const ruleData: Omit<TransactionRule, 'id'> = {
      title: title.trim(),
      amount: parsedAmount,
      type,
      recurrence,
      category,
      source: editingRule?.source || 'MANUAL',
      active: editingRule ? editingRule.active : true,
      date: recurrence === 'ONCE' ? date : undefined,
      dayOfMonth: recurrence === 'RECURRING' ? parseInt(dayOfMonth, 10) : undefined,
      startDate: recurrence === 'RECURRING' && startDate ? startDate : undefined,
      endDate: recurrence === 'RECURRING' && endDate ? endDate : undefined,
    };

    onSaveRule(ruleData, editingRule?.id);
    onClose();
  };

  const isOutOfRange =
    recurrence === 'ONCE' &&
    date &&
    ((forecastStartDate && date < forecastStartDate) || (forecastEndDate && date > forecastEndDate));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                editingRule ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {editingRule ? <Pencil size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {editingRule ? 'Редактировать правило / операцию' : 'Создать правило / операцию'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingRule ? 'Изменение параметров в модели cash flow' : 'Добавление транзакции в финансовый прогноз'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Название операции
            </label>
            <input
              type="text"
              required
              placeholder="Например: Зарплата, Ипотека, Покупка оборудования"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Сумма (₽)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="45 000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-semibold transition shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Поток денег
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs ${
                  type === 'INCOME'
                    ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                    : 'border-rose-300 bg-rose-50/50 text-rose-800'
                }`}
              >
                <option value="EXPENSE">Расход (-)</option>
                <option value="INCOME">Доход (+)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Периодичность
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
              >
                <option value="ONCE">Разово (в указанную дату)</option>
                <option value="RECURRING">Ежемесячно (циклическое)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
              >
                <option value="COMMON">Обычное (COMMON)</option>
                <option value="CREDIT">Кредит / Долг / Ипотека (CREDIT)</option>
                <option value="BUSINESS">Бизнес / Налоги</option>
                <option value="LIVING">Жизнь / Быт</option>
              </select>
            </div>
          </div>

          {recurrence === 'ONCE' ? (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Дата события
                </label>
                {forecastStartDate && forecastEndDate && (
                  <span className="text-[11px] text-slate-400">
                    Период: {forecastStartDate} – {forecastEndDate}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs cursor-pointer font-medium"
              />
              {isOutOfRange && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>
                    Дата находится вне диапазона активного прогноза ({forecastStartDate} – {forecastEndDate}).
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Число (1–31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-medium transition shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Старт (необязат.)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
                    title="С какого месяца активировать правило"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Окончание
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs"
                    placeholder="Бессрочно"
                    title="Дата окончания выплат (например, закрытие кредита)"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Правило будет повторяться каждый месяц {dayOfMonth}-го числа в заданном диапазоне дат.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-sm cursor-pointer"
            >
              {editingRule ? 'Сохранить изменения' : 'Добавить операцию'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
