import React, { useState, useRef, useEffect } from 'react';

export const ForecastChart = ({ data: rawData, activeHoverIndex, onHoverPointChange }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  // Инициализируем адаптивную сетку размеров. Защита от сжатия влево.
  const [dimensions, setDimensions] = useState({ width: 800, height: 380 });

  // Эффект ResizeObserver для мгновенной подстройки физических пикселей SVG под размеры карточки Nginx
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = (entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({ width: width, height: 380 });
        }
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    
    // Мгновенный первичный замер для исключения сжатия влево при первой загрузке
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setDimensions({ width: rect.width, height: 380 });
    }

    return () => resizeObserver.disconnect();
  }, [rawData]);

  // Безопасное извлечение массива данных из структуры ответа Go-микросервиса
  let data = [];
  if (Array.isArray(rawData)) {
    data = rawData;
  } else if (rawData && typeof rawData === 'object') {
    const foundArray = Object.values(rawData).find(val => Array.isArray(val));
    if (foundArray) data = foundArray;
  }

  // Автоматический расчёт экстремумов ликвидности с запасом прочности 25%
  const balances = data.map(d => d?.balance || 0);
  let maxVal = Math.max(...balances, 10000);
  let minVal = Math.min(...balances, -10000);
  
  const marginRatio = 0.25;
  const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal));
  maxVal = absMax * (1 + marginRatio);
  minVal = -absMax * (1 + marginRatio);
  const valRange = maxVal - minVal;

  // Технические отступы внутри координатной сетки SVG
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;

  const graphWidth = dimensions.width - paddingLeft - paddingRight;
  const graphHeight = dimensions.height - paddingTop - paddingBottom;

  // Математические функции-трансформеры индексов и денег в пиксели SVG
  const getX = (index) => paddingLeft + (index / (data.length - 1)) * graphWidth;
  const getY = (val) => paddingTop + graphHeight - ((val - minVal) / valRange) * graphHeight;
  // Синхронизация внешнего ховера (из смарт-таймлайна операций)
  useEffect(() => {
    if (activeHoverIndex !== null && activeHoverIndex !== undefined && data[activeHoverIndex]) {
      const point = data[activeHoverIndex];
      setHoveredPoint({
        ...point,
        x: getX(activeHoverIndex),
        y: getY(point.balance || 0),
        index: activeHoverIndex
      });
    } else if (activeHoverIndex === null) {
      setHoveredPoint(null);
    }
  }, [activeHoverIndex, dimensions.width, data.length]);

  // Заглушка ожидания формирования финансовой матрицы
  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center text-muted" style={{ height: '380px' }}>
        <div className="text-center">
          <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
          <p className="mb-0 small fw-bold">Матрица Cash Flow формируется...</p>
        </div>
      </div>
    );
  }

  // Геометрия путей ступенчатого графика тренда (stepAfter)
  let pathPoints = [];
  let areaPoints = [];
  
  pathPoints.push(`${getX(0)},${getY(data[0]?.balance || 0)}`);
  areaPoints.push(`${getX(0)},${getY(0)}`);
  areaPoints.push(`${getX(0)},${getY(data[0]?.balance || 0)}`);

  for (let i = 0; i < data.length - 1; i++) {
    const nextX = getX(i + 1);
    const currentBalance = data[i]?.balance || 0;
    const nextBalance = data[i + 1]?.balance || 0;
    
    pathPoints.push(`${nextX},${getY(currentBalance)}`);
    pathPoints.push(`${nextX},${getY(nextBalance)}`);
    
    areaPoints.push(`${nextX},${getY(currentBalance)}`);
    areaPoints.push(`${nextX},${getY(nextBalance)}`);
  }
  areaPoints.push(`${getX(data.length - 1)},${getY(0)}`);

  const pathDefinition = `M ${pathPoints.join(' L ')}`;
  const areaDefinition = `M ${areaPoints.join(' L ')} Z`;
  const zeroY = getY(0);

  // МАТЕМАТИЧЕСКИ ТОЧНЫЙ расчёт положения мыши относительно реального размера SVG
  const handleMouseMove = (e) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - paddingLeft;
    
    if (mouseX < 0 || mouseX > graphWidth) {
      setHoveredPoint(null);
      if (onHoverPointChange) onHoverPointChange(null);
      return;
    }

    const pct = mouseX / graphWidth;
    const index = Math.min(Math.max(Math.round(pct * (data.length - 1)), 0), data.length - 1);
    const targetPoint = data[index];

    if (targetPoint) {
      setHoveredPoint({
        ...targetPoint,
        x: getX(index),
        y: getY(targetPoint.balance || 0),
        index: index
      });
      setTooltipPos({
        x: e.clientX - rect.left + 20,
        y: e.clientY - rect.top - 120
      });
      if (onHoverPointChange) onHoverPointChange(index);
    }
  };

  const gridTicks = [minVal, minVal / 2, 0, maxVal / 2, maxVal];

    return (
    <div 
      ref={containerRef} 
      className="w-100" 
      style={{ height: '380px', position: 'relative' }} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={() => { setHoveredPoint(null); if (onHoverPointChange) onHoverPointChange(null); }}
    >
      {/* ИСПРАВЛЕНО: SVG привязан к физическим пикселям dimensions.width */}
      <svg width={dimensions.width} height={dimensions.height} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="svgColorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.20}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
          </linearGradient>
        </defs>

        {/* Горизонтальная сетка */}
        {gridTicks.map((tick, i) => (
          <g key={i}>
            <line x1={paddingLeft} y1={getY(tick)} x2={dimensions.width - paddingRight} y2={getY(tick)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={paddingLeft - 12} y={getY(tick) + 4} fill="#94A3B8" fontSize="10" textAnchor="end" style={{ fontFamily: 'monospace' }}>
              {`${(tick / 1000).toFixed(0)}к`}
            </text>
          </g>
        ))}

        {/* Шкала дат по оси X */}
        {data.map((item, i) => {
          if ((i % 15 === 0 || i === data.length - 1) && item?.date) {
            return (
              <g key={i}>
                <line x1={getX(i)} y1={dimensions.height - paddingBottom} x2={getX(i)} y2={dimensions.height - paddingBottom + 5} stroke="rgba(255,255,255,0.1)" />
                <text x={getX(i)} y={dimensions.height - paddingBottom + 20} fill="#94A3B8" fontSize="10" textAnchor="middle">
                  {item.date.substring(5)}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* Площадь заливки градиента */}
        <path d={areaDefinition} fill="url(#svgColorBalance)" />

        {/* Критическая линия 0 ₽ */}
        {zeroY >= paddingTop && zeroY <= paddingTop + graphHeight && (
          <g>
            <line x1={paddingLeft} y1={zeroY} x2={dimensions.width - paddingRight} y2={zeroY} stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={dimensions.width - paddingRight - 10} y={zeroY - 6} fill="#EF4444" fontSize="10" fontWeight="bold" textAnchor="end">
              CASH GAP LIMIT
            </text>
          </g>
        )}

        {/* ИСПРАВЛЕНО: Мульти-ключевой проход для генерации импульсов транзакций (вверх/вниз) */}
        {data.map((item, i) => {
          const amt = parseFloat(item?.amount || item?.income_amount || item?.expense_amount || 0);
          const cx = getX(i);
          const cy = getY(item.balance || 0);

          if (amt === 0) return null;

          return (
            <g key={i}>
              {amt > 0 ? (
                <g>
                  <line x1={cx} y1={cy} x2={cx} y2={cy - 20} stroke="#22C55E" strokeWidth="2.5" strokeOpacity="0.8" />
                  <circle cx={cx} cy={cy - 20} r="3" fill="#22C55E" />
                </g>
              ) : (
                <g>
                  <line x1={cx} y1={cy} x2={cx} y2={cy + 20} stroke="#EF4444" strokeWidth="2.5" strokeOpacity="0.8" />
                  <circle cx={cx} cy={cy + 20} r="3" fill="#EF4444" />
                </g>
              )}
            </g>
          );
        })}

        {/* Основная линия тренда баланса ликвидности */}
        <path d={pathDefinition} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Точка ховера на линии */}
        {hoveredPoint && (
          <g>
            <line x1={hoveredPoint.x} y1={paddingTop} x2={hoveredPoint.x} y2={dimensions.height - paddingBottom} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="#22D3EE" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* ТУЛТИП: Отображает точные данные на основе любых ключей транзакций бэкенда */}
      {hoveredPoint && (
        <div className="position-absolute p-3 rounded-3 border text-white shadow-2xl" style={{
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          zIndex: 1000,
          pointerEvents: 'none',
          minWidth: '200px'
        }}>
          <div className="small fw-bold text-slate-400 mb-1" style={{ fontSize: '11px' }}>{hoveredPoint.date}</div>
          <div className="fw-black fs-5 border-bottom pb-2 mb-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {parseFloat(hoveredPoint.balance || 0).toLocaleString('ru-RU')} ₽
          </div>
          
          {(hoveredPoint.name || hoveredPoint.operation_name || hoveredPoint.title) ? (
            <div className="small">
              <div className="text-slate-500 text-uppercase fw-bold mb-1" style={{ fontSize: '9px' }}>Триггер изменения:</div>
              <div className="fw-bold text-white truncate" style={{ maxWidth: '170px' }}>
                {hoveredPoint.name || hoveredPoint.operation_name || hoveredPoint.title}
              </div>
              <div className={`fw-black mt-1 ${parseFloat(hoveredPoint.amount || hoveredPoint.income_amount || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {parseFloat(hoveredPoint.amount || hoveredPoint.income_amount || 0) >= 0 ? '▲ +' : '▼ '}
                {parseFloat(hoveredPoint.amount || hoveredPoint.income_amount || hoveredPoint.expense_amount || 0).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          ) : (
            <div className="small text-slate-500 italic">Операций не зафиксировано</div>
          )}

          {/* Подсказка ПКМ в выпадающем тултипе */}
          <div className="pt-2 mt-2 border-top d-flex justify-content-between align-items-center" style={{ borderColor: 'rgba(255,255,255,0.08)', fontSize: '10px' }}>
            <span className="d-flex align-items-center gap-1">
              <span className="badge bg-purple bg-opacity-25 text-purple border border-purple border-opacity-50" style={{ color: '#c084fc', borderColor: '#a855f7' }}>ПКМ</span>
              <span className="text-secondary">по графику</span>
            </span>
            <span className="text-secondary opacity-75">добавить / срез</span>
          </div>
        </div>
      )}
    </div>
  );
};
