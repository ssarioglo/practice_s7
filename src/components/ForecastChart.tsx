import React, { useState, useRef, useEffect } from 'react';
import { DailyPoint } from '../types/finance.ts';

interface ForecastChartProps {
  points: DailyPoint[];
  onHoverPointChange?: (point: DailyPoint | null) => void;
  onSelectPoint?: (point: DailyPoint) => void;
  selectedPoint?: DailyPoint | null;
  activeHoverPoint?: DailyPoint | null;
  activeDate?: string | null;
  contextPoint?: DailyPoint | null;
  onContextMenu?: (point: DailyPoint, coords: { x: number; y: number }) => void;
  hoveredRuleId?: string | null;
  safetyBuffer?: number;
  customHeight?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  points,
  onHoverPointChange,
  onSelectPoint,
  selectedPoint,
  activeHoverPoint,
  activeDate,
  contextPoint,
  onContextMenu,
  hoveredRuleId,
  safetyBuffer,
  customHeight = 270,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartHeight = customHeight;
  const [dimensions, setDimensions] = useState({ width: 900, height: chartHeight });
  const [hoveredPoint, setHoveredPoint] = useState<DailyPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const clientWidth = el.clientWidth;
      if (clientWidth > 0) {
        setDimensions({
          width: clientWidth,
          height: chartHeight,
        });
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateSize);
      });
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [chartHeight]);

  if (!points || points.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white border border-gray-300 text-gray-500 text-xs">
        Нет данных для построения графика прогноза
      </div>
    );
  }

  const paddingLeft = 72;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 34;

  const graphWidth = Math.max(dimensions.width - paddingLeft - paddingRight, 100);
  const graphHeight = Math.max(chartHeight - paddingTop - paddingBottom, 50);

  const balances = points.map((p) => p.closingBalance);
  const rawMin = Math.min(...balances, 0);
  const rawMax = Math.max(...balances, 10000);

  const minVal = rawMin < 0 ? rawMin * 1.15 : 0;
  const maxVal = rawMax > 0 ? rawMax * 1.15 : 10000;
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft;
    return paddingLeft + (index / (points.length - 1)) * graphWidth;
  };

  const getY = (val: number) => {
    const normalized = (val - minVal) / valRange;
    return paddingTop + (1 - normalized) * graphHeight;
  };

  const zeroY = getY(0);

  const pathPoints: string[] = [];
  const areaPoints: string[] = [];

  pathPoints.push(`${getX(0)},${getY(points[0].closingBalance)}`);
  areaPoints.push(`${getX(0)},${zeroY}`);
  areaPoints.push(`${getX(0)},${getY(points[0].closingBalance)}`);

  for (let i = 0; i < points.length - 1; i++) {
    const nextX = getX(i + 1);
    const currY = getY(points[i].closingBalance);
    const nextY = getY(points[i + 1].closingBalance);

    pathPoints.push(`${nextX},${currY}`);
    pathPoints.push(`${nextX},${nextY}`);

    areaPoints.push(`${nextX},${currY}`);
    areaPoints.push(`${nextX},${nextY}`);
  }

  areaPoints.push(`${getX(points.length - 1)},${zeroY}`);

  const pathDefinition = `M ${pathPoints.join(' L ')}`;
  const areaDefinition = `M ${areaPoints.join(' L ')} Z`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - paddingLeft;

    if (mouseX < 0 || mouseX > graphWidth) {
      setHoveredPoint(null);
      if (onHoverPointChange) onHoverPointChange(null);
      return;
    }

    const pct = mouseX / graphWidth;
    const index = Math.min(
      Math.max(Math.round(pct * (points.length - 1)), 0),
      points.length - 1
    );
    const target = points[index];
    setHoveredPoint(target);

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    const tooltipWidth = 220;
    const tooltipHeight = 160;
    const cursorGap = 14;

    let posX: number;
    if (relX + cursorGap + tooltipWidth <= dimensions.width - 10) {
      posX = relX + cursorGap;
    } else {
      posX = Math.max(10, relX - cursorGap - tooltipWidth);
    }

    let posY = relY - tooltipHeight / 2;
    posY = Math.max(6, Math.min(posY, chartHeight - tooltipHeight - 6));

    setTooltipPos({ x: posX, y: posY });
    if (onHoverPointChange) onHoverPointChange(target);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 && hoveredPoint && onSelectPoint) {
      onSelectPoint(hoveredPoint);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current || points.length === 0 || !onContextMenu) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - paddingLeft;
    const pct = Math.min(Math.max(mouseX / graphWidth, 0), 1);
    const index = Math.min(
      Math.max(Math.round(pct * (points.length - 1)), 0),
      points.length - 1
    );
    const target = points[index];
    if (target) {
      onContextMenu(target, { x: e.clientX, y: e.clientY });
    }
  };

  const tickSteps = [minVal, minVal / 2, 0, maxVal / 2, maxVal].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 bg-white border border-gray-300 relative z-20 select-none ${
        hoveredPoint ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ height: `${chartHeight}px` }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseLeave={() => {
        setHoveredPoint(null);
        if (onHoverPointChange) onHoverPointChange(null);
      }}
    >
      <svg
        width={dimensions.width}
        height={chartHeight}
        className="w-full block overflow-visible"
      >
        {/* фон области графика */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={graphWidth}
          height={graphHeight}
          fill="#fafafa"
          stroke="#cccccc"
          strokeWidth="1"
        />

        {/* красная зона ниже нуля */}
        {zeroY < paddingTop + graphHeight && (
          <rect
            x={paddingLeft}
            y={zeroY}
            width={graphWidth}
            height={paddingTop + graphHeight - zeroY}
            fill="#f2dede"
            opacity="0.55"
          />
        )}

        {/* сетка по Y */}
        {tickSteps.map((tick, i) => {
          const y = getY(tick);
          if (y < paddingTop || y > paddingTop + graphHeight) return null;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={dimensions.width - paddingRight}
                y2={y}
                stroke={tick === 0 ? '#a94442' : '#dcdcdc'}
                strokeWidth={tick === 0 ? 1.5 : 1}
                strokeDasharray={tick === 0 ? '4 3' : undefined}
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                fill={tick === 0 ? '#a94442' : '#555555'}
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
                fontWeight={tick === 0 ? 'bold' : 'normal'}
              >
                {tick === 0
                  ? '0 ₽'
                  : Math.abs(tick) >= 1000000
                  ? `${(tick / 1000000).toFixed(1)} млн`
                  : `${(tick / 1000).toFixed(0)} тыс.`}
              </text>
            </g>
          );
        })}

        {/* подписи дат снизу */}
        {points.map((p, i) => {
          const interval = points.length <= 35 ? 5 : points.length <= 90 ? 10 : 20;
          if (i % interval === 0 || i === points.length - 1) {
            const x = getX(i);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={chartHeight - paddingBottom}
                  stroke="#eeeeee"
                />
                <line
                  x1={x}
                  y1={chartHeight - paddingBottom}
                  x2={x}
                  y2={chartHeight - paddingBottom + 4}
                  stroke="#888888"
                />
                <text
                  x={x}
                  y={chartHeight - paddingBottom + 16}
                  fill="#444444"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {p.formattedDate}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* заливка под линией */}
        <path d={areaDefinition} fill="#d9edf7" opacity="0.5" />

        {/* резерв если задан */}
        {safetyBuffer &&
          safetyBuffer > 0 &&
          (() => {
            const bufferY = getY(safetyBuffer);
            if (bufferY >= paddingTop && bufferY <= paddingTop + graphHeight) {
              return (
                <g>
                  <line
                    x1={paddingLeft}
                    y1={bufferY}
                    x2={dimensions.width - paddingRight}
                    y2={bufferY}
                    stroke="#8a6d3b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={dimensions.width - paddingRight - 4}
                    y={bufferY - 4}
                    fill="#8a6d3b"
                    fontSize="9.5"
                    textAnchor="end"
                  >
                    {`Резерв: ${(safetyBuffer / 1000).toFixed(0)} тыс. ₽`}
                  </text>
                </g>
              );
            }
            return null;
          })()}

        {/* точки в дни когда были операции */}
        {points.map((p, i) => {
          if (p.transactions.length === 0) return null;

          const cx = getX(i);
          const cy = getY(p.closingBalance);

          const incomes = p.transactions.filter((tx) => tx.type === 'INCOME');
          const expenses = p.transactions.filter((tx) => tx.type === 'EXPENSE');
          const hasIncome = incomes.length > 0;
          const hasExpense = expenses.length > 0;

          const isIncomeHovered = Boolean(
            hoveredRuleId && incomes.some((tx) => tx.ruleId === hoveredRuleId)
          );
          const isExpenseHovered = Boolean(
            hoveredRuleId && expenses.some((tx) => tx.ruleId === hoveredRuleId)
          );
          const isAnyHovered = isIncomeHovered || isExpenseHovered;

          return (
            <g key={i}>
              {isAnyHovered && (
                <line
                  x1={cx}
                  y1={paddingTop}
                  x2={cx}
                  y2={chartHeight - paddingBottom}
                  stroke="#337ab7"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isAnyHovered ? 4.5 : 3}
                fill={hasIncome && !hasExpense ? '#3c763d' : '#a94442'}
                stroke="#ffffff"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* сама синяя линия баланса */}
        <path
          d={pathDefinition}
          fill="none"
          stroke="#337ab7"
          strokeWidth="2"
        />

        {/* вертикальная линия при наведении мышки */}
        {(() => {
          const pt =
            hoveredPoint ||
            activeHoverPoint ||
            (activeDate ? points.find((p) => p.date === activeDate) : null) ||
            selectedPoint;
          if (!pt) return null;
          const hx = getX(pt.dayIndex);
          const hy = getY(pt.closingBalance);
          return (
            <g className="pointer-events-none">
              <line
                x1={hx}
                y1={paddingTop}
                x2={hx}
                y2={chartHeight - paddingBottom}
                stroke="#333333"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={hx} cy={hy} r={4.5} fill="#337ab7" stroke="#ffffff" strokeWidth={1.5} />
            </g>
          );
        })()}
      </svg>

      {/* всплывашка с остатком на день */}
      {hoveredPoint && (
        <div
          className="absolute p-2.5 bg-white border border-gray-500 text-gray-800 shadow-xs pointer-events-none z-50 select-none text-xs"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            width: '220px',
          }}
        >
          <div className="flex justify-between items-center font-bold border-b border-gray-300 pb-1 mb-1">
            <span>
              {hoveredPoint.date} ({hoveredPoint.dayOfWeek})
            </span>
            {hoveredPoint.isCashGap && (
              <span className="text-[#a94442] font-bold text-[10px]">
                [РАЗРЫВ]
              </span>
            )}
          </div>
          <div
            className={`text-sm font-bold font-mono mb-1.5 ${
              hoveredPoint.closingBalance < 0 ? 'text-[#a94442]' : 'text-gray-900'
            }`}
          >
            Остаток: {hoveredPoint.closingBalance.toLocaleString('ru-RU')} ₽
          </div>

          {hoveredPoint.transactions.length > 0 ? (
            <div className="space-y-0.5 text-[11px] border-t border-gray-200 pt-1">
              {hoveredPoint.transactions.slice(0, 4).map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="truncate max-w-[120px] text-gray-700">{tx.title}</span>
                  <span
                    className={`font-mono font-bold ${
                      tx.type === 'INCOME' ? 'text-[#3c763d]' : 'text-[#a94442]'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {tx.amount.toLocaleString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-gray-500">Операций нет</div>
          )}

          <div className="pt-1 mt-1 border-t border-gray-200 flex justify-between text-[10px] text-gray-500">
            <span>ЛКМ: детали дня</span>
            <span>ПКМ: меню</span>
          </div>
        </div>
      )}
    </div>
  );
};
