import React, { useState, useEffect } from 'react';
import {
  TransactionRule,
  TransactionType,
  RecurrenceType,
  RecurrenceInterval,
  Counterparty,
  CounterpartyType,
} from '../types/finance.ts';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (ruleData: Omit<TransactionRule, 'id'>, existingId?: string) => void;
  editingRule?: TransactionRule | null;
  prefillData?: { date?: string; type?: TransactionType; title?: string } | null;
  defaultDate?: string;
  forecastStartDate?: string;
  forecastEndDate?: string;
  counterparties?: Counterparty[];
  onAddCounterparty?: (cp: Omit<Counterparty, 'id'>) => Counterparty;
}

export const CORPORATE_ACCOUNTS = [
  'Р/с ••4812 (СберБизнес — Основной)',
  'Р/с ••9045 (Альфа-Банк — Эквайринг)',
  'Депозит ••1104 (Резервный фонд)',
];

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  onSaveRule,
  editingRule,
  prefillData,
  defaultDate = '2026-10-24',
  forecastStartDate,
  forecastEndDate,
  counterparties = [],
  onAddCounterparty,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('ONCE');
  const [intervalType, setIntervalType] = useState<RecurrenceInterval>('MONTH');
  const [customIntervalDays, setCustomIntervalDays] = useState('3');
  const [category, setCategory] = useState('OPERATIONAL');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [accountName, setAccountName] = useState(CORPORATE_ACCOUNTS[0]);
  const [date, setDate] = useState(defaultDate);
  const [dayOfMonth, setDayOfMonth] = useState('10');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isCreatingCp, setIsCreatingCp] = useState(false);
  const [newCpName, setNewCpName] = useState('');
  const [newCpInn, setNewCpInn] = useState('');
  const [newCpType, setNewCpType] = useState<CounterpartyType>('VENDOR');

  useEffect(() => {
    if (!isOpen) return;
    setIsCreatingCp(false);

    if (editingRule) {
      setTitle(editingRule.title);
      setAmount(String(editingRule.amount));
      setType(editingRule.type);
      setRecurrence(editingRule.recurrence);
      setIntervalType(editingRule.intervalType || 'MONTH');
      setCustomIntervalDays(String(editingRule.customIntervalDays || 3));
      setCategory(editingRule.category || 'OPERATIONAL');
      setCounterpartyId(editingRule.counterpartyId || '');
      setAccountName(editingRule.accountName || CORPORATE_ACCOUNTS[0]);
      setDate(editingRule.date || defaultDate);
      setDayOfMonth(String(editingRule.dayOfMonth || 10));
      setStartDate(editingRule.startDate || '');
      setEndDate(editingRule.endDate || '');
    } else if (prefillData) {
      const targetDate = prefillData.date || defaultDate;
      setTitle(prefillData.title || '');
      setAmount('');
      setType(prefillData.type || 'EXPENSE');
      setRecurrence('ONCE');
      setIntervalType('MONTH');
      setCustomIntervalDays('3');
      setCategory('OPERATIONAL');
      setCounterpartyId('');
      setAccountName(CORPORATE_ACCOUNTS[0]);
      setDate(targetDate);
      const day = parseInt(targetDate.split('-')[2] || '10', 10);
      setDayOfMonth(String(day));
      setStartDate('');
      setEndDate('');
    } else {
      setTitle('');
      setAmount('');
      setType('EXPENSE');
      setRecurrence('ONCE');
      setIntervalType('MONTH');
      setCustomIntervalDays('3');
      setCategory('OPERATIONAL');
      setCounterpartyId('');
      setAccountName(CORPORATE_ACCOUNTS[0]);
      setDate(defaultDate);
      const day = parseInt(defaultDate.split('-')[2] || '10', 10);
      setDayOfMonth(String(day));
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen, editingRule, prefillData, defaultDate]);

  if (!isOpen) return null;

  const handleQuickAddCounterparty = () => {
    if (!newCpName.trim() || !onAddCounterparty) return;
    const created = onAddCounterparty({
      name: newCpName.trim(),
      inn: newCpInn.trim() || undefined,
      type: newCpType,
      defaultCategory: category,
    });
    setCounterpartyId(created.id);
    setNewCpName('');
    setNewCpInn('');
    setIsCreatingCp(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.abs(parseFloat(amount) || 0);
    if (!title.trim() || parsedAmount <= 0) return;

    const selectedCp = counterparties.find((c) => c.id === counterpartyId);
    const parsedCustomDays = Math.max(1, parseInt(customIntervalDays, 10) || 2);

    onSaveRule(
      {
        title: title.trim(),
        amount: parsedAmount,
        type,
        recurrence,
        category,
        source: editingRule ? editingRule.source : 'MANUAL',
        counterpartyId: selectedCp ? selectedCp.id : undefined,
        counterpartyName: selectedCp ? selectedCp.name : editingRule?.counterpartyName,
        counterpartyInn: selectedCp ? selectedCp.inn : editingRule?.counterpartyInn,
        accountName,
        date: recurrence === 'ONCE' ? date : undefined,
        intervalType: recurrence === 'RECURRING' ? intervalType : undefined,
        customIntervalDays:
          recurrence === 'RECURRING' && intervalType === 'CUSTOM_DAYS'
            ? parsedCustomDays
            : undefined,
        dayOfMonth:
          recurrence === 'RECURRING' && intervalType === 'MONTH'
            ? Math.min(31, Math.max(1, parseInt(dayOfMonth, 10) || 1))
            : undefined,
        startDate:
          recurrence === 'RECURRING'
            ? startDate || (intervalType !== 'MONTH' ? forecastStartDate || defaultDate : undefined)
            : undefined,
        endDate: recurrence === 'RECURRING' && endDate ? endDate : undefined,
        active: editingRule ? editingRule.active : true,
      },
      editingRule?.id
    );

    onClose();
  };

  const isWillBeArchived =
    forecastStartDate &&
    ((recurrence === 'ONCE' && date < forecastStartDate) ||
      (recurrence === 'RECURRING' && endDate && endDate < forecastStartDate));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-500 shadow-md w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* шапка модалки */}
        <div className="px-4 py-2.5 bg-[#337ab7] text-white flex justify-between items-center border-b border-gray-400">
          <h4 className="font-bold text-sm">
            {editingRule ? 'Редактирование операции' : 'Добавление новой операции'}
          </h4>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 font-bold text-sm px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* форма */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Назначение операции / Основание:
            </label>
            <input
              type="text"
              required
              placeholder="Напр., Оплата аренды серверов или Выручка по эквайрингу"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-400 text-xs focus:outline-none focus:border-[#337ab7]"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-gray-700">Контрагент:</label>
                {onAddCounterparty && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCp(!isCreatingCp)}
                    className="text-[11px] text-[#337ab7] underline cursor-pointer"
                  >
                    {isCreatingCp ? 'Отмена' : '+ Добавить нового'}
                  </button>
                )}
              </div>
              <select
                value={counterpartyId}
                onChange={(e) => setCounterpartyId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-400 bg-white text-xs"
              >
                <option value="">— Не выбран —</option>
                {counterparties.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name} {cp.inn ? `(ИНН ${cp.inn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Расчетный счет:</label>
              <select
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-400 bg-white text-xs"
              >
                {CORPORATE_ACCOUNTS.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCreatingCp && (
            <div className="p-2.5 bg-gray-100 border border-gray-300 space-y-2">
              <div className="font-bold text-gray-800">Новый контрагент в справочник:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Наименование (ООО / АО)"
                  value={newCpName}
                  onChange={(e) => setNewCpName(e.target.value)}
                  className="sm:col-span-2 px-2 py-1 bg-white border border-gray-400 text-xs"
                />
                <input
                  type="text"
                  placeholder="ИНН"
                  value={newCpInn}
                  onChange={(e) => setNewCpInn(e.target.value)}
                  className="px-2 py-1 bg-white border border-gray-400 text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={newCpType}
                  onChange={(e) => setNewCpType(e.target.value as CounterpartyType)}
                  className="px-2 py-1 bg-white border border-gray-400 text-xs"
                >
                  <option value="VENDOR">Поставщик</option>
                  <option value="CLIENT">Плательщик / Заказчик</option>
                  <option value="BANK">Банк</option>
                  <option value="TAX">ФНС / Госорган</option>
                  <option value="INTERNAL">Внутренний реестр</option>
                </select>
                <button
                  type="button"
                  onClick={handleQuickAddCounterparty}
                  className="px-3 py-1 bg-[#337ab7] text-white text-xs font-bold cursor-pointer"
                >
                  Сохранить контрагента
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Сумма (руб.):</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-400 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Тип операции:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full px-2 py-1.5 border border-gray-400 bg-white text-xs font-bold"
              >
                <option value="EXPENSE">Списание / Расход (-)</option>
                <option value="INCOME">Приход / Поступление (+)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Характер операции:</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full px-2 py-1.5 border border-gray-400 bg-white text-xs"
              >
                <option value="ONCE">Разовая (в конкретную дату)</option>
                <option value="RECURRING">Циклическая (периодическая)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Статья ДДС:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-400 bg-white text-xs"
              >
                <option value="OPERATIONAL">Операционная (OpEx)</option>
                <option value="PAYROLL">ФОТ и персонал</option>
                <option value="TAX">Налоги и сборы</option>
                <option value="INVESTMENT">Инвестиционная (CapEx)</option>
                <option value="FINANCIAL">Финансовая / Кредиты</option>
              </select>
            </div>
          </div>

          {recurrence === 'ONCE' ? (
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Дата проведения операции:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-400 text-xs"
              />
              {isWillBeArchived && (
                <div className="mt-1.5 p-2 bg-gray-100 border border-gray-400 text-gray-700 text-[11px]">
                  Внимание: выбранная дата ({date}) ранее даты «Старт» ({forecastStartDate}). Запись будет помечена как <strong>«Архив»</strong>.
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-100 border border-gray-300 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Периодичность:
                  </label>
                  <div className="flex items-center border border-gray-400 bg-white">
                    <span className="px-2 py-1.5 bg-gray-200 border-r border-gray-400 font-bold text-gray-800 whitespace-nowrap">
                      Раз в:
                    </span>
                    <select
                      value={intervalType}
                      onChange={(e) => setIntervalType(e.target.value as RecurrenceInterval)}
                      className="w-full px-2 py-1.5 bg-white text-xs focus:outline-none"
                    >
                      <option value="MONTH">месяц</option>
                      <option value="WEEK">неделю</option>
                      <option value="BIWEEKLY">2 недели</option>
                      <option value="YEAR">год</option>
                      <option value="CUSTOM_DAYS">произвольно</option>
                    </select>
                  </div>
                </div>

                {intervalType === 'CUSTOM_DAYS' ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Через сколько дней повторяется:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      required
                      value={customIntervalDays}
                      onChange={(e) => setCustomIntervalDays(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-400 text-xs font-mono font-bold"
                    />
                  </div>
                ) : intervalType === 'MONTH' ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Число месяца (1–31):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-400 text-xs font-mono"
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-600 py-1">
                    Отсчет ведется от даты начала цикла.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Дата начала:
                  </label>
                  <input
                    type="date"
                    required={intervalType !== 'MONTH'}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Дата окончания (необяз.):
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-gray-400 text-xs"
                  />
                </div>
              </div>

              {isWillBeArchived && (
                <div className="p-2 bg-gray-200 border border-gray-400 text-gray-700 text-[11px]">
                  Дата окончания ({endDate}) ранее даты «Старт» ({forecastStartDate}). Правило будет помещено в <strong>«Архив»</strong>.
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-gray-300 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 border border-gray-400 text-gray-800 text-xs cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#337ab7] hover:bg-[#286090] border border-[#204d74] text-white text-xs font-bold cursor-pointer"
            >
              {editingRule ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
