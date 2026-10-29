import React, { useEffect, useRef } from 'react';
import { DailyPoint } from '../types/finance.ts';
import { PlusCircle, ArrowDownRight, ArrowUpRight, BarChart2, X, Calendar } from 'lucide-react';

export interface ContextMenuProps {
  x: number;
  y: number;
  point: DailyPoint;
  onClose: () => void;
  onAddRule: (point: DailyPoint, type?: 'INCOME' | 'EXPENSE') => void;
  onViewDaySlice: (point: DailyPoint) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  point,
  onClose,
  onAddRule,
  onViewDaySlice,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Viewport bounds clamping
  const menuWidth = 260;
  const menuHeight = 220;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl py-1.5 text-slate-200 text-xs select-none w-64 animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
      }}
    >
      {/* Header with target point date & balance */}
      <div className="px-3 py-2 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Calendar size={13} className="text-blue-400" />
          <span>{point.date}</span>
          <span className="text-[10px] text-slate-500 font-normal">({point.dayOfWeek})</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-bold text-[11px] ${
              point.closingBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {point.closingBalance.toLocaleString('ru-RU')} ₽
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Menu Actions */}
      <div className="p-1 space-y-0.5">
        <button
          onClick={() => {
            onAddRule(point);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-800 text-slate-200 transition group"
        >
          <PlusCircle size={15} className="text-blue-400 group-hover:scale-110 transition" />
          <div className="flex-1">
            <div className="font-medium">Добавить правило...</div>
            <div className="text-[10px] text-slate-400">Форма с автоподстановкой даты</div>
          </div>
        </button>

        <button
          onClick={() => {
            onAddRule(point, 'EXPENSE');
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-800 text-slate-200 transition group"
        >
          <ArrowDownRight size={15} className="text-rose-400 group-hover:scale-110 transition" />
          <div className="flex-1">
            <div className="font-medium text-rose-300">Добавить расход (-)</div>
            <div className="text-[10px] text-slate-400">Списание с {point.formattedDate}</div>
          </div>
        </button>

        <button
          onClick={() => {
            onAddRule(point, 'INCOME');
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-800 text-slate-200 transition group"
        >
          <ArrowUpRight size={15} className="text-emerald-400 group-hover:scale-110 transition" />
          <div className="flex-1">
            <div className="font-medium text-emerald-300">Добавить доход (+)</div>
            <div className="text-[10px] text-slate-400">Поступление на {point.formattedDate}</div>
          </div>
        </button>

        <div className="h-px bg-slate-800 my-1" />

        <button
          onClick={() => {
            onViewDaySlice(point);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-800 text-slate-200 transition group"
        >
          <BarChart2 size={15} className="text-cyan-400 group-hover:scale-110 transition" />
          <div className="flex-1">
            <div className="font-medium text-cyan-300">Показать срез баланса</div>
            <div className="text-[10px] text-slate-400">Детализация транзакций дня</div>
          </div>
        </button>
      </div>
    </div>
  );
};
