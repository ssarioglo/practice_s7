import React from 'react';
import { DailyPoint } from '../types/finance.ts';
import {
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Plus,
  X,
  Wallet,
  Tag,
} from 'lucide-react';

interface DaySliceModalProps {
  point: DailyPoint;
  onClose: () => void;
  onAddTransaction: (point: DailyPoint) => void;
}

export const DaySliceModal: React.FC<DaySliceModalProps> = ({
  point,
  onClose,
  onAddTransaction,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Финансовый срез на {point.date}
              </h3>
              <p className="text-xs text-slate-500">
                День недели: {point.dayOfWeek} (день #{point.dayIndex + 1} в горизонте планирования)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Cash gap indicator if below zero */}
          {point.isCashGap ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold">Обнаружен кассовый разрыв (Cash Gap)!</div>
                <div className="text-rose-700 mt-0.5">
                  Баланс опустился ниже нуля на{' '}
                  <strong className="font-mono font-bold">
                    {point.gapDeficit.toLocaleString('ru-RU')} ₽
                  </strong>
                  . Требуется перенос платежей или привлечение ликвидности.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Остаток в пределах нормы, ликвидность стабильна.</span>
            </div>
          )}

          {/* Balance breakdown grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1">Входящий остаток (Start):</div>
              <div className="font-mono font-bold text-slate-800 text-base">
                {point.openingBalance.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1">Итоговый остаток (End):</div>
              <div
                className={`font-mono font-bold text-base ${
                  point.closingBalance < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {point.closingBalance.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1 flex items-center gap-1 text-emerald-700">
                <ArrowUpRight size={13} /> Поступления за день:
              </div>
              <div className="font-mono font-bold text-emerald-600 text-sm">
                +{point.incomeTotal.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-slate-500 mb-1 flex items-center gap-1 text-rose-700">
                <ArrowDownRight size={13} /> Списания за день:
              </div>
              <div className="font-mono font-bold text-rose-600 text-sm">
                -{point.expenseTotal.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Transactions list on this day */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              События и транзакции дня ({point.transactions.length})
            </h4>

            {point.transactions.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {point.transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{tx.title}</span>
                        {tx.source !== 'MANUAL' && (
                          <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-800 rounded font-normal">
                            {tx.source}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Tag size={10} />
                        <span>Категория: {tx.category}</span>
                      </div>
                    </div>

                    <div
                      className={`font-mono font-bold text-sm ${
                        tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}
                      {tx.amount.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-400 text-xs italic">
                В этот день запланированных списаний и поступлений нет.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={() => {
              onClose();
              onAddTransaction(point);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition shadow-xs"
          >
            <Plus size={14} /> Добавить транзакцию на эту дату
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-100 transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
