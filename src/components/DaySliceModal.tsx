import React from 'react';
import { DailyPoint } from '../types/finance.ts';

interface DaySliceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayData: DailyPoint | null;
  onAddTransaction: (date: string) => void;
}

export const DaySliceModal: React.FC<DaySliceModalProps> = ({
  isOpen,
  onClose,
  dayData,
  onAddTransaction,
}) => {
  if (!isOpen || !dayData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border-2 border-gray-500 shadow-md w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#337ab7] text-white border-b border-gray-500">
          <div>
            <h3 className="text-sm font-bold">
              Выписка за {dayData.date} ({dayData.dayOfWeek})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200 font-bold text-sm px-1 cursor-pointer"
          >
            [X]
          </button>
        </div>

        <div className="p-4 bg-[#f5f5f5] text-xs space-y-3">
          <table className="w-full border-collapse border border-gray-400 bg-white">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold text-gray-700 border-r border-gray-300">
                  Входящий остаток (утро):
                </td>
                <td className="p-2 text-right font-mono font-bold text-gray-900">
                  {dayData.openingBalance.toLocaleString('ru-RU')} руб.
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold text-gray-700 border-r border-gray-300">
                  Приход за день (+):
                </td>
                <td className="p-2 text-right font-mono font-bold text-[#3c763d]">
                  +{dayData.incomeTotal.toLocaleString('ru-RU')} руб.
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="p-2 font-bold text-gray-700 border-r border-gray-300">
                  Списание за день (-):
                </td>
                <td className="p-2 text-right font-mono font-bold text-[#a94442]">
                  -{dayData.expenseTotal.toLocaleString('ru-RU')} руб.
                </td>
              </tr>
              <tr className={dayData.isCashGap ? 'bg-[#f2dede]' : 'bg-[#eeeeee]'}>
                <td className="p-2 font-bold text-gray-800 border-r border-gray-300">
                  Исходящий остаток (вечер):
                </td>
                <td
                  className={`p-2 text-right font-mono font-bold ${
                    dayData.isCashGap ? 'text-[#a94442]' : 'text-gray-900'
                  }`}
                >
                  {dayData.closingBalance.toLocaleString('ru-RU')} руб.
                </td>
              </tr>
            </tbody>
          </table>

          <div>
            <div className="font-bold text-gray-800 mb-1.5">
              Операции за дату ({dayData.transactions.length}):
            </div>
            {dayData.transactions.length === 0 ? (
              <div className="p-3 bg-white border border-gray-400 text-center text-gray-500">
                Операций на этот день не запланировано.
              </div>
            ) : (
              <div className="bg-white border border-gray-400 max-h-48 overflow-y-auto divide-y divide-gray-300">
                {dayData.transactions.map((tx, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{tx.title}</div>
                      {tx.counterpartyName && (
                        <div className="text-[11px] text-gray-600">{tx.counterpartyName}</div>
                      )}
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        tx.type === 'INCOME' ? 'text-[#3c763d]' : 'text-[#a94442]'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}
                      {tx.amount.toLocaleString('ru-RU')} руб.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-400 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-400 font-medium cursor-pointer"
            >
              Закрыть
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddTransaction(dayData.date);
              }}
              className="px-3 py-1.5 bg-[#337ab7] hover:bg-[#286090] text-white font-bold border border-[#2e6da4] cursor-pointer"
            >
              + Добавить операцию на эту дату
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
