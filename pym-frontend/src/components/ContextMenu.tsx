import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  date: string;
  onClose: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onInspectDay: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  date,
  onClose,
  onAddIncome,
  onAddExpense,
  onInspectDay,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const style = {
    top: Math.min(y, window.innerHeight - 180),
    left: Math.min(x, window.innerWidth - 220),
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 w-52 bg-white border border-gray-500 shadow-md text-xs"
    >
      <div className="px-2.5 py-1.5 bg-[#eeeeee] border-b border-gray-400 font-bold text-gray-800">
        Дата: {date}
      </div>
      <div className="divide-y divide-gray-200">
        <button
          type="button"
          onClick={onAddIncome}
          className="w-full px-2.5 py-1.5 text-left text-gray-800 hover:bg-[#f5f5f5] font-medium block"
        >
          [+] Добавить Приход
        </button>
        <button
          type="button"
          onClick={onAddExpense}
          className="w-full px-2.5 py-1.5 text-left text-gray-800 hover:bg-[#f5f5f5] font-medium block"
        >
          [-] Добавить Списание
        </button>
        <button
          type="button"
          onClick={onInspectDay}
          className="w-full px-2.5 py-1.5 text-left text-[#337ab7] hover:bg-[#f5f5f5] font-bold block"
        >
          [=] Подробная выписка за день
        </button>
      </div>
    </div>
  );
};
