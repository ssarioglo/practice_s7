import React, { useState } from 'react';
import { Counterparty, DailyPoint, TransactionRule } from '../types/finance.ts';
import { formatCategoryLabel } from '../engine/forecast.ts';

interface CalendarLedgerProps {
  points: DailyPoint[];
  rules: TransactionRule[];
  counterparties: Counterparty[];
  onEditRule: (rule: TransactionRule) => void;
  onAddCounterparty: (cp: Omit<Counterparty, 'id'>) => void;
  onDeleteCounterparty: (id: string) => void;
}

export const CalendarLedger: React.FC<CalendarLedgerProps> = ({
  points,
  rules,
  counterparties,
  onEditRule,
  onAddCounterparty,
  onDeleteCounterparty,
}) => {
  const [subTab, setSubTab] = useState<'ledger' | 'counterparties'>('ledger');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterCounterparty, setFilterCounterparty] = useState<string>('ALL');

  const [cpName, setCpName] = useState('');
  const [cpInn, setCpInn] = useState('');
  const [cpType, setCpType] = useState<Counterparty['type']>('VENDOR');
  const [cpContract, setCpContract] = useState('');
  const [cpAccount, setCpAccount] = useState('');

  const handleAddCp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim()) return;
    onAddCounterparty({
      name: cpName.trim(),
      inn: cpInn.trim() || undefined,
      type: cpType,
      contract: cpContract.trim() || undefined,
      accountNumber: cpAccount.trim() || undefined,
    });
    setCpName('');
    setCpInn('');
    setCpContract('');
    setCpAccount('');
  };

  const allOperations = points.flatMap((day) =>
    day.transactions.map((tx) => ({
      ...tx,
      date: day.date,
      endOfDayBalance: day.closingBalance,
      isCashGap: day.isCashGap,
    }))
  );

  const filteredOperations = allOperations.filter((op) => {
    if (filterType !== 'ALL' && op.type !== filterType) return false;
    if (filterCounterparty !== 'ALL' && op.counterpartyId !== filterCounterparty) return false;
    return true;
  });

  const formatCpRole = (type: Counterparty['type']) => {
    switch (type) {
      case 'CLIENT':
        return 'Заказчик';
      case 'VENDOR':
        return 'Поставщик';
      case 'BANK':
        return 'Банк';
      case 'TAX':
        return 'Госорган / ФНС';
      case 'INTERNAL':
        return 'Внутр. реестр';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] border border-gray-400 p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1 text-xs font-bold border cursor-pointer ${
              subTab === 'ledger'
                ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
            }`}
          >
            Журнал платежных операций ({filteredOperations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('counterparties')}
            className={`px-3 py-1 text-xs font-bold border cursor-pointer ${
              subTab === 'counterparties'
                ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
            }`}
          >
            Справочник контрагентов ({counterparties.length})
          </button>
        </div>

        {subTab === 'ledger' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-gray-700 font-bold">Вид операции:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE')}
              className="px-2 py-1 bg-white border border-gray-400 text-xs focus:outline-none focus:border-[#337ab7]"
            >
              <option value="ALL">Все операции</option>
              <option value="INCOME">Только Приход (+)</option>
              <option value="EXPENSE">Только Списание (-)</option>
            </select>

            <label className="text-gray-700 font-bold ml-1">Контрагент:</label>
            <select
              value={filterCounterparty}
              onChange={(e) => setFilterCounterparty(e.target.value)}
              className="px-2 py-1 bg-white border border-gray-400 text-xs focus:outline-none focus:border-[#337ab7]"
            >
              <option value="ALL">Все контрагенты</option>
              {counterparties.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} {cp.inn ? `(ИНН ${cp.inn})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {subTab === 'ledger' ? (
        <div className="bg-white border border-gray-400">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#eeeeee] border-b border-gray-400 text-gray-800 sticky top-0">
                <tr>
                  <th className="py-2 px-2.5 border-r border-gray-300">Дата</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Вид</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Назначение платежа</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Контрагент / ИНН</th>
                  <th className="py-2 px-2.5 border-r border-gray-300">Расчетный счет</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">Сумма (руб.)</th>
                  <th className="py-2 px-2.5 border-r border-gray-300 text-right">
                    Остаток на конец дня
                  </th>
                  <th className="py-2 px-2.5 text-center">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredOperations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      Платежных операций за выбранный период не найдено.
                    </td>
                  </tr>
                ) : (
                  filteredOperations.map((op, idx) => {
                    const parentRule = rules.find((r) => r.id === op.ruleId);
                    return (
                      <tr
                        key={`${op.date}-${op.ruleId}-${idx}`}
                        className={op.isCashGap ? 'bg-[#f2dede]' : 'hover:bg-[#f9f9f9]'}
                      >
                        <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono whitespace-nowrap">
                          {op.date}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-gray-300 whitespace-nowrap">
                          {op.type === 'INCOME' ? (
                            <span className="text-[#3c763d] font-bold">Приход</span>
                          ) : (
                            <span className="text-[#a94442] font-bold">Списание</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-gray-300">
                          <div className="font-bold text-gray-900">{op.title}</div>
                          <div className="text-[11px] text-gray-500">
                            {formatCategoryLabel(op.category)}
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-gray-300">
                          {op.counterpartyName ? (
                            <div>
                              <div className="text-gray-800">{op.counterpartyName}</div>
                              {op.counterpartyInn && (
                                <div className="text-[11px] text-gray-500 font-mono">
                                  ИНН: {op.counterpartyInn}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-gray-300">
                          <div className="text-gray-800">{op.accountName || 'Основной р/с'}</div>
                        </td>
                        <td
                          className={`py-1.5 px-2.5 border-r border-gray-300 text-right font-mono font-bold whitespace-nowrap ${
                            op.type === 'INCOME' ? 'text-[#3c763d]' : 'text-[#a94442]'
                          }`}
                        >
                          {op.type === 'INCOME' ? '+' : '-'}
                          {op.amount.toLocaleString('ru-RU')}
                        </td>
                        <td
                          className={`py-1.5 px-2.5 border-r border-gray-300 text-right font-mono whitespace-nowrap ${
                            op.endOfDayBalance < 0
                              ? 'text-[#a94442] font-bold'
                              : 'text-gray-800'
                          }`}
                        >
                          {op.endOfDayBalance.toLocaleString('ru-RU')}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {parentRule && (
                            <button
                              type="button"
                              onClick={() => onEditRule(parentRule)}
                              className="text-[#337ab7] hover:underline font-medium cursor-pointer"
                            >
                              [Изм.]
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#f5f5f5] border border-gray-400 p-3 h-fit">
            <h3 className="text-xs font-bold text-gray-800 uppercase border-b border-gray-300 pb-1.5 mb-3">
              Добавление контрагента в базу
            </h3>
            <form onSubmit={handleAddCp} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Наименование организации / ФИО *
                </label>
                <input
                  type="text"
                  required
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  placeholder='ООО "ТехноСнаб"'
                  className="w-full px-2 py-1.5 bg-white border border-gray-400 focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ИНН</label>
                  <input
                    type="text"
                    value={cpInn}
                    onChange={(e) => setCpInn(e.target.value)}
                    placeholder="7701234567"
                    className="w-full px-2 py-1.5 bg-white border border-gray-400 font-mono focus:outline-none focus:border-[#337ab7]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Роль</label>
                  <select
                    value={cpType}
                    onChange={(e) => setCpType(e.target.value as Counterparty['type'])}
                    className="w-full px-2 py-1.5 bg-white border border-gray-400 focus:outline-none focus:border-[#337ab7]"
                  >
                    <option value="VENDOR">Поставщик</option>
                    <option value="CLIENT">Заказчик / Плательщик</option>
                    <option value="BANK">Банк</option>
                    <option value="TAX">Госорган / ФНС</option>
                    <option value="INTERNAL">Внутренний реестр</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Основной договор</label>
                <input
                  type="text"
                  value={cpContract}
                  onChange={(e) => setCpContract(e.target.value)}
                  placeholder="Договор № 45/26 от 12.01.2026"
                  className="w-full px-2 py-1.5 bg-white border border-gray-400 focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Расчетный счет (р/с)</label>
                <input
                  type="text"
                  value={cpAccount}
                  onChange={(e) => setCpAccount(e.target.value)}
                  placeholder="40702810..."
                  className="w-full px-2 py-1.5 bg-white border border-gray-400 font-mono focus:outline-none focus:border-[#337ab7]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 px-3 bg-[#337ab7] hover:bg-[#286090] text-white font-bold border border-[#2e6da4] mt-1 cursor-pointer"
              >
                Занести в справочник
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-400">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#eeeeee] border-b border-gray-400 text-gray-800">
                  <tr>
                    <th className="py-2 px-2.5 border-r border-gray-300">Роль</th>
                    <th className="py-2 px-2.5 border-r border-gray-300">Наименование</th>
                    <th className="py-2 px-2.5 border-r border-gray-300">ИНН</th>
                    <th className="py-2 px-2.5 border-r border-gray-300">Договор / Реквизиты</th>
                    <th className="py-2 px-2.5 text-center">Удалить</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {counterparties.map((cp) => (
                    <tr key={cp.id} className="hover:bg-[#f9f9f9]">
                      <td className="py-1.5 px-2.5 border-r border-gray-300 font-bold text-gray-700">
                        {formatCpRole(cp.type)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-gray-300 font-bold text-gray-900">
                        {cp.name}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-gray-300 font-mono text-gray-700">
                        {cp.inn || '—'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-gray-300 text-gray-700">
                        <div>{cp.contract || 'Без договора'}</div>
                        {cp.accountNumber && (
                          <div className="text-[11px] text-gray-500 font-mono">
                            р/с: {cp.accountNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteCounterparty(cp.id)}
                          className="text-[#a94442] hover:underline font-medium cursor-pointer"
                        >
                          [Уд.]
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
