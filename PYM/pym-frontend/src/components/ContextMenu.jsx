import React, { useEffect, useRef } from 'react';

export const ContextMenu = ({ x, y, point, onClose, onAddRule, onViewDaySlice }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const menuWidth = 260;
  const menuHeight = 220;
  const clampedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const clampedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      className="position-fixed shadow-2xl p-1 rounded-3 border text-white"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        backgroundColor: 'rgba(15, 23, 42, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(16px)',
        zIndex: 1050,
        minWidth: '240px',
        fontSize: '12px',
      }}
    >
      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <div className="fw-bold text-slate-300">
          <span>📅 {point?.date}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`font-monospace fw-bold ${parseFloat(point?.balance || 0) < 0 ? 'text-danger' : 'text-success'}`}>
            {parseFloat(point?.balance || 0).toLocaleString('ru-RU')} ₽
          </span>
          <button onClick={onClose} className="btn-close btn-close-white" style={{ fontSize: '9px' }} />
        </div>
      </div>

      <div className="p-1">
        <button
          className="btn btn-sm w-100 text-start text-white d-flex align-items-center gap-2 py-2 px-2 rounded hover-bg"
          onClick={() => { onAddRule(point); onClose(); }}
        >
          <span className="text-primary fs-6">➕</span>
          <div>
            <div className="fw-semibold">Добавить правило...</div>
            <div className="small text-secondary" style={{ fontSize: '10px' }}>Форма с датой {point?.date}</div>
          </div>
        </button>

        <button
          className="btn btn-sm w-100 text-start text-white d-flex align-items-center gap-2 py-2 px-2 rounded hover-bg"
          onClick={() => { onAddRule(point, 'EXPENSE'); onClose(); }}
        >
          <span className="text-danger fs-6">📉</span>
          <div>
            <div className="fw-semibold text-danger">Добавить расход (-)</div>
            <div className="small text-secondary" style={{ fontSize: '10px' }}>Списание на {point?.date}</div>
          </div>
        </button>

        <button
          className="btn btn-sm w-100 text-start text-white d-flex align-items-center gap-2 py-2 px-2 rounded hover-bg"
          onClick={() => { onAddRule(point, 'INCOME'); onClose(); }}
        >
          <span className="text-success fs-6">📈</span>
          <div>
            <div className="fw-semibold text-success">Добавить доход (+)</div>
            <div className="small text-secondary" style={{ fontSize: '10px' }}>Поступление на {point?.date}</div>
          </div>
        </button>

        <hr className="my-1 border-secondary opacity-25" />

        <button
          className="btn btn-sm w-100 text-start text-white d-flex align-items-center gap-2 py-2 px-2 rounded hover-bg"
          onClick={() => { onViewDaySlice(point); onClose(); }}
        >
          <span className="text-info fs-6">🔍</span>
          <div>
            <div className="fw-semibold text-info">Показать срез баланса</div>
            <div className="small text-secondary" style={{ fontSize: '10px' }}>Детализация точки временного ряда</div>
          </div>
        </button>
      </div>
    </div>
  );
};
