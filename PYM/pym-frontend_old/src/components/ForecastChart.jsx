import React, { useState, useRef, useEffect } from 'react';

export const ForecastChart = ({ data: rawData }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 320 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 500,
          height: 320
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  let data = [];
  if (Array.isArray(rawData)) {
    data = rawData;
  } else if (rawData && typeof rawData === 'object') {
    const foundArray = Object.values(rawData).find(val => Array.isArray(val));
    if (foundArray) data = foundArray;
  }

  if (!data || data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center text-muted" style={{ height: '320px' }}>
        <div className="text-center">
          <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
          <p className="mb-0 small fw-bold text-secondary">Матрица Cash Flow формируется бэкендом...</p>
        </div>
      </div>
    );
  }

  const balances = data.map(d => d?.balance || 0);
  let maxVal = Math.max(...balances, 10000);
  let minVal = Math.min(...balances, -10000);
  
  const marginRatio = 0.15;
  const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal));
  maxVal = absMax * (1 + marginRatio);
  minVal = -absMax * (1 + marginRatio);
  const valRange = maxVal - minVal;

  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const graphWidth = dimensions.width - paddingLeft - paddingRight;
  const graphHeight = dimensions.height - paddingTop - paddingBottom;

  const getX = (index) => paddingLeft + (index / (data.length - 1)) * graphWidth;
  const getY = (val) => paddingTop + graphHeight - ((val - minVal) / valRange) * graphHeight;

  let pathPoints = [];
  let areaPoints = [];
  
  if (data.length > 0) {
    const firstBalance = data[0]?.balance || 0;
    pathPoints.push(`${getX(0)},${getY(firstBalance)}`);
    areaPoints.push(`${getX(0)},${getY(0)}`);
    areaPoints.push(`${getX(0)},${getY(firstBalance)}`);
  }

  for (let i = 0; i < data.length - 1; i++) {
    const nextX = getX(i + 1);
    const currentBalance = data[i]?.balance || 0;
    const nextBalance = data[i + 1]?.balance || 0;
    
    pathPoints.push(`${nextX},${getY(currentBalance)}`);
    pathPoints.push(`${nextX},${getY(nextBalance)}`);
    
    areaPoints.push(`${nextX},${getY(currentBalance)}`);
    areaPoints.push(`${nextX},${getY(nextBalance)}`);
  }

  if (data.length > 0) {
    areaPoints.push(`${getX(data.length - 1)},${getY(0)}`);
  }

  const pathDefinition = `M ${pathPoints.join(' L ')}`;
  const areaDefinition = `M ${areaPoints.join(' L ')} Z`;
  const zeroY = getY(0);

  const handleMouseMove = (e) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - paddingLeft;
    
    if (mouseX < 0 || mouseX > graphWidth) {
      setHoveredPoint(null);
      return;
    }

    const pct = mouseX / graphWidth;
    const index = Math.min(Math.max(Math.round(pct * (data.length - 1)), 0), data.length - 1);
    const targetPoint = data[index];

    if (targetPoint) {
      setHoveredPoint({
        ...targetPoint,
        x: getX(index),
        y: getY(targetPoint.balance || 0)
      });

      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 70
      });
    }
  };

  const gridTicks = [minVal, minVal / 2, 0, maxVal / 2, maxVal];

  return (
    <div ref={containerRef} className="position-relative w-100" style={{ height: '320px' }} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredPoint(null)}>
      <svg width={dimensions.width} height={dimensions.height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="svgColorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4e73df" stopOpacity={0.25}/>
            <stop offset="95%" stopColor="#4e73df" stopOpacity={0.0}/>
          </linearGradient>
        </defs>

        {/* Контрастная темная сетка и оси */}
        {gridTicks.map((tick, i) => (
          <g key={i}>
            <line x1={paddingLeft} y1={getY(tick)} x2={dimensions.width - paddingRight} y2={getY(tick)} stroke="#eaecf4" strokeWidth="1.5" />
            <text x={paddingLeft - 12} y={getY(tick) + 4} fill="#5a5c69" fontSize="11" fontWeight="600" textAnchor="end">
              {`${(tick / 1000).toFixed(0)}к`}
            </text>
          </g>
        ))}

        {/* Даты на оси X */}
        {data.map((item, i) => {
          if ((i % 15 === 0 || i === data.length - 1) && item?.date) {
            return (
              <g key={i}>
                <line x1={getX(i)} y1={dimensions.height - paddingBottom} x2={getX(i)} y2={dimensions.height - paddingBottom + 5} stroke="#d1d3e2" />
                <text x={getX(i)} y={dimensions.height - paddingBottom + 20} fill="#5a5c69" fontSize="11" fontWeight="600" textAnchor="middle">
                  {item.date.substring(5)}
                </text>
              </g>
            );
          }
          return null;
        })}

        <path d={areaDefinition} fill="url(#svgColorBalance)" />

        {/* Линия кассового разрыва (Агрессивно-красная для светлой темы) */}
        {zeroY >= paddingTop && zeroY <= paddingTop + graphHeight && (
          <g>
            <line x1={paddingLeft} y1={zeroY} x2={dimensions.width - paddingRight} y2={zeroY} stroke="#e74a3b" strokeWidth="2.5" strokeDasharray="5 4" />
            <text x={dimensions.width - paddingRight - 10} y={zeroY - 8} fill="#e74a3b" fontSize="11" fontWeight="bold" textAnchor="end">
              КРИТИЧЕСКИЙ РУБЕЖ (0 ₽)
            </text>
          </g>
        )}

        <path d={pathDefinition} fill="none" stroke="#4e73df" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {hoveredPoint && (
          <g>
            <line x1={hoveredPoint.x} y1={paddingTop} x2={hoveredPoint.x} y2={dimensions.height - paddingBottom} stroke="#4e73df" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="6" fill="#4e73df" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* Тултип: черный текст на белом фоне */}
      {hoveredPoint && (
        <div className="position-absolute p-2 rounded shadow border" style={{
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          backgroundColor: '#ffffff',
          borderColor: '#d1d3e2',
          zIndex: 1000,
          pointerEvents: 'none',
          minWidth: '140px'
        }}>
          <div className="small fw-bold text-secondary mb-1">{hoveredPoint.date}</div>
          <div className={`fw-bold fs-6 ${(hoveredPoint.balance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
            {(hoveredPoint.balance || 0).toLocaleString('ru-RU')} ₽
          </div>
        </div>
      )}
    </div>
  );
};
