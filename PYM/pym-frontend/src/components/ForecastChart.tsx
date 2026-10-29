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
  isCompact?: boolean;
  showCompactTooltip?: boolean;
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
  isCompact = false,
  showCompactTooltip = false,
  customHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartHeight = customHeight ?? (isCompact ? 120 : 380);
  const [dimensions, setDimensions] = useState({ width: 900, height: chartHeight });
  const [hoveredPoint, setHoveredPoint] = useState<DailyPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showClickHint, setShowClickHint] = useState(false);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoveredIndexRef = useRef<number | null>(null);

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
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      window.removeEventListener('resize', updateSize);
    };
  }, [chartHeight]);

  if (!points || points.length === 0) {
    return (
      <div className={`flex items-center justify-center ${isCompact ? 'h-28' : 'h-80'} bg-slate-900 rounded-xl text-slate-400 text-xs`}>
        Нет данных для построения графика прогноза
      </div>
    );
  }

  const paddingLeft = isCompact ? 54 : 70;
  const paddingRight = isCompact ? 22 : 40;
  const paddingTop = isCompact ? 12 : 30;
  const paddingBottom = isCompact ? 22 : 45;

  const graphWidth = Math.max(dimensions.width - paddingLeft - paddingRight, 100);
  const graphHeight = Math.max(chartHeight - paddingTop - paddingBottom, 50);

  const balances = points.map((p) => p.closingBalance);
  const rawMin = Math.min(...balances, 0);
  const rawMax = Math.max(...balances, 10000);

  // Add 15% headroom
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

  // Stepped trend path (stepAfter)
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

    // Collision-free tooltip coordinates:
    // Keep a strict lateral offset from the cursor so it NEVER covers the pointer or data point.
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    setMouseCoords({ x: relX, y: relY });

    if (lastHoveredIndexRef.current !== index) {
      lastHoveredIndexRef.current = index;
      setShowClickHint(false);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setShowClickHint(true);
      }, 2000);
    }

    const tooltipWidth = 240;
    const tooltipHeight = isCompact ? 165 : 195;
    const cursorGap = 16;
    const marginX = 10;
    const marginY = 6;

    // Horizontal: prefer placing to the right (+gap). If it exceeds container width, flip to the left (-gap - width).
    let posX: number;
    if (relX + cursorGap + tooltipWidth <= dimensions.width - marginX) {
      posX = relX + cursorGap;
    } else {
      posX = Math.max(marginX, relX - cursorGap - tooltipWidth);
    }

    // Vertical: in compact mode, anchor comfortably near cursor while allowing smooth overflow outside container
    let posY: number;
    if (isCompact) {
      posY = Math.max(4, Math.min(relY - 20, 35));
    } else {
      posY = relY - tooltipHeight / 2;
      posY = Math.max(marginY, Math.min(posY, chartHeight - tooltipHeight - marginY));
    }

    setTooltipPos({ x: posX, y: posY });
    if (onHoverPointChange) onHoverPointChange(target);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowClickHint(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Left-click (primary button) directly selects day or scrolls
    if (e.button === 0 && hoveredPoint && onSelectPoint) {
      onSelectPoint(hoveredPoint);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current || points.length === 0 || !onContextMenu) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - paddingLeft;
    const clampedMouseX = Math.max(0, Math.min(mouseX, graphWidth));
    const pct = clampedMouseX / graphWidth;
    const index = Math.min(
      Math.max(Math.round(pct * (points.length - 1)), 0),
      points.length - 1
    );
    const target = points[index];
    if (target) {
      onContextMenu(target, { x: e.clientX, y: e.clientY });
    }
  };

  // Ticks for Y axis - in compact mode we compress to max 3 key ticks to prevent clutter
  const tickSteps = isCompact
    ? (minVal < 0 ? [minVal, 0, maxVal] : [0, maxVal]).filter((v, i, arr) => arr.indexOf(v) === i)
    : [minVal, minVal / 2, 0, maxVal / 2, maxVal].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-0 overflow-visible relative z-20 select-none ${hoveredPoint ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ height: `${chartHeight}px` }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseLeave={() => {
        setHoveredPoint(null);
        setShowClickHint(false);
        lastHoveredIndexRef.current = null;
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        if (onHoverPointChange) onHoverPointChange(null);
      }}
    >
      <svg
        width={dimensions.width}
        height={chartHeight}
        className="w-full block overflow-visible"
      >
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Deficit Zone (Below 0 ₽) */}
        {zeroY < paddingTop + graphHeight && (
          <rect
            x={paddingLeft}
            y={zeroY}
            width={graphWidth}
            height={paddingTop + graphHeight - zeroY}
            fill="url(#deficitGradient)"
          />
        )}

        {/* Horizontal grid lines & labels */}
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
                stroke={tick === 0 ? '#ef4444' : 'rgba(148, 163, 184, 0.15)'}
                strokeWidth={tick === 0 ? 1.5 : 1}
                strokeDasharray={tick === 0 ? '4 3' : '3 3'}
              />
              <text
                x={paddingLeft - (isCompact ? 6 : 10)}
                y={y + (isCompact ? 3 : 4)}
                fill={tick === 0 ? '#ef4444' : '#94a3b8'}
                fontSize={isCompact ? '9' : '11'}
                textAnchor="end"
                fontFamily="monospace"
                fontWeight={tick === 0 ? 'bold' : 'normal'}
              >
                {`${(tick / 1000).toFixed(0)}k ₽`}
              </text>
            </g>
          );
        })}

        {/* X Axis dates */}
        {points.map((p, i) => {
          const interval = isCompact
            ? points.length <= 35
              ? 7
              : points.length <= 90
              ? 15
              : 30
            : points.length <= 35
            ? 5
            : points.length <= 90
            ? 10
            : 20;
          if (i % interval === 0 || i === points.length - 1) {
            const x = getX(i);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={chartHeight - paddingBottom}
                  x2={x}
                  y2={chartHeight - paddingBottom + (isCompact ? 3 : 5)}
                  stroke="rgba(148, 163, 184, 0.3)"
                />
                <text
                  x={x}
                  y={chartHeight - paddingBottom + (isCompact ? 13 : 20)}
                  fill="#94a3b8"
                  fontSize={isCompact ? '8.5' : '10'}
                  textAnchor="middle"
                >
                  {p.formattedDate}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* Area fill */}
        <path d={areaDefinition} fill="url(#balanceGradient)" />

        {/* 0 ₽ Cash Gap Barrier Label */}
        {zeroY >= paddingTop && zeroY <= paddingTop + graphHeight && (
          <text
            x={dimensions.width - paddingRight - 8}
            y={zeroY - (isCompact ? 3 : 6)}
            fill="#ef4444"
            fontSize={isCompact ? '8.5' : '10'}
            fontWeight="bold"
            textAnchor="end"
          >
            {isCompact ? '0 ₽ Limit' : '⚠️ CASH GAP LIMIT (0 ₽)'}
          </text>
        )}

        {/* Optional Safety Buffer Threshold */}
        {safetyBuffer && safetyBuffer > 0 && (() => {
          const bufferY = getY(safetyBuffer);
          if (bufferY >= paddingTop && bufferY <= paddingTop + graphHeight) {
            return (
              <g>
                <line
                  x1={paddingLeft}
                  y1={bufferY}
                  x2={dimensions.width - paddingRight}
                  y2={bufferY}
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity={0.8}
                />
                <text
                  x={dimensions.width - paddingRight - 8}
                  y={bufferY - (isCompact ? 3 : 5)}
                  fill="#f59e0b"
                  fontSize={isCompact ? '8' : '9.5'}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {isCompact
                    ? `БУФЕР (${(safetyBuffer / 1000).toFixed(0)}k ₽)`
                    : `🛡️ БУФЕР БЕЗОПАСНОСТИ (${(safetyBuffer / 1000).toFixed(0)}k ₽)`}
                </text>
              </g>
            );
          }
          return null;
        })()}

        {/* Step Transition Impulse Markers for daily transactions */}
        {points.map((p, i) => {
          if (p.transactions.length === 0) return null;
          const cx = getX(i);
          const cy = getY(p.closingBalance);

          const incomes = p.transactions.filter((tx) => tx.type === 'INCOME');
          const expenses = p.transactions.filter((tx) => tx.type === 'EXPENSE');
          const hasIncome = incomes.length > 0;
          const hasExpense = expenses.length > 0;
          const isMixed = hasIncome && hasExpense;

          const isIncomeHovered = Boolean(
            hoveredRuleId && incomes.some((tx) => tx.ruleId === hoveredRuleId)
          );
          const isExpenseHovered = Boolean(
            hoveredRuleId && expenses.some((tx) => tx.ruleId === hoveredRuleId)
          );
          const hoveredIncomeTx = hoveredRuleId
            ? incomes.find((tx) => tx.ruleId === hoveredRuleId)
            : undefined;
          const hoveredExpenseTx = hoveredRuleId
            ? expenses.find((tx) => tx.ruleId === hoveredRuleId)
            : undefined;
          const isAnyHovered = isIncomeHovered || isExpenseHovered;

          // Clamped stem tip coordinates to stay within chart padding
          const incomeSpikeLength = isCompact
            ? (isIncomeHovered ? 16 : 10)
            : (isIncomeHovered ? 28 : 22);
          const incomeTargetY = Math.max(paddingTop + (isCompact ? 4 : 8), cy - incomeSpikeLength);

          const expenseSpikeLength = isCompact
            ? (isExpenseHovered ? 16 : 10)
            : (isExpenseHovered ? 28 : 22);
          const expenseTargetY = Math.min(
            chartHeight - paddingBottom - (isCompact ? 4 : 8),
            cy + expenseSpikeLength
          );

          return (
            <g key={i}>
              {/* Vertical guideline when this day contains the hovered rule */}
              {isAnyHovered && (
                <line
                  x1={cx}
                  y1={paddingTop}
                  x2={cx}
                  y2={chartHeight - paddingBottom}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
              )}

              {/* UPWARD GREEN STEM: Incomes */}
              {hasIncome && (
                <g>
                  {/* Outer pulse aura when hovered from rules table */}
                  {isIncomeHovered && (
                    <circle
                      cx={cx}
                      cy={incomeTargetY}
                      r={11}
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth={1.5}
                      strokeOpacity={0.6}
                    />
                  )}

                  {/* Upward stem line */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx}
                    y2={incomeTargetY}
                    stroke={isIncomeHovered ? '#15803d' : '#22c55e'}
                    strokeWidth={isIncomeHovered ? 3.5 : 2}
                    strokeLinecap="round"
                  />

                  {/* Leaf Tip: Dot for single income, badge with counter for multiple */}
                  {incomes.length === 1 ? (
                    <circle
                      cx={cx}
                      cy={incomeTargetY}
                      r={isIncomeHovered ? (isCompact ? 4.5 : 5.5) : (isCompact ? 2.5 : 3.5)}
                      fill={isIncomeHovered ? '#15803d' : '#22c55e'}
                      stroke={isIncomeHovered ? '#ffffff' : 'none'}
                      strokeWidth={isIncomeHovered ? 2 : 0}
                    />
                  ) : (
                    <g className="pointer-events-none select-none">
                      <circle
                        cx={cx}
                        cy={incomeTargetY}
                        r={isIncomeHovered ? (isCompact ? 6 : 7.5) : (isCompact ? 4.5 : 6)}
                        fill={isIncomeHovered ? '#15803d' : '#22c55e'}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <text
                        x={cx}
                        y={incomeTargetY}
                        fill="#ffffff"
                        fontSize={isCompact ? '7' : '8'}
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {incomes.length}
                      </text>
                    </g>
                  )}

                  {/* Floating amount label when hovered from table */}
                  {isIncomeHovered && hoveredIncomeTx && (
                    <g className="pointer-events-none select-none">
                      <rect
                        x={cx - 60}
                        y={incomeTargetY - 26}
                        width={120}
                        height={18}
                        rx={4}
                        fill="#0f172a"
                        fillOpacity={0.92}
                        stroke="#22c55e"
                        strokeWidth={1}
                      />
                      <text
                        x={cx}
                        y={incomeTargetY - 14}
                        fill="#4ade80"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        +{hoveredIncomeTx.amount.toLocaleString('ru-RU')} ₽
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* DOWNWARD RED STEM: Expenses */}
              {hasExpense && (
                <g>
                  {/* Outer pulse aura when hovered from rules table */}
                  {isExpenseHovered && (
                    <circle
                      cx={cx}
                      cy={expenseTargetY}
                      r={11}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth={1.5}
                      strokeOpacity={0.6}
                    />
                  )}

                  {/* Downward stem line */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx}
                    y2={expenseTargetY}
                    stroke={isExpenseHovered ? '#991b1b' : '#ef4444'}
                    strokeWidth={isExpenseHovered ? 3.5 : 2}
                    strokeLinecap="round"
                  />

                  {/* Leaf Tip: Dot for single expense, badge with counter for multiple */}
                  {expenses.length === 1 ? (
                    <circle
                      cx={cx}
                      cy={expenseTargetY}
                      r={isExpenseHovered ? (isCompact ? 4.5 : 5.5) : (isCompact ? 2.5 : 3.5)}
                      fill={isExpenseHovered ? '#991b1b' : '#ef4444'}
                      stroke={isExpenseHovered ? '#ffffff' : 'none'}
                      strokeWidth={isExpenseHovered ? 2 : 0}
                    />
                  ) : (
                    <g className="pointer-events-none select-none">
                      <circle
                        cx={cx}
                        cy={expenseTargetY}
                        r={isExpenseHovered ? (isCompact ? 6 : 7.5) : (isCompact ? 4.5 : 6)}
                        fill={isExpenseHovered ? '#991b1b' : '#ef4444'}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <text
                        x={cx}
                        y={expenseTargetY}
                        fill="#ffffff"
                        fontSize={isCompact ? '7' : '8'}
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {expenses.length}
                      </text>
                    </g>
                  )}

                  {/* Floating amount label when hovered from table */}
                  {isExpenseHovered && hoveredExpenseTx && (
                    <g className="pointer-events-none select-none">
                      <rect
                        x={cx - 60}
                        y={expenseTargetY + 10}
                        width={120}
                        height={18}
                        rx={4}
                        fill="#0f172a"
                        fillOpacity={0.92}
                        stroke="#ef4444"
                        strokeWidth={1}
                      />
                      <text
                        x={cx}
                        y={expenseTargetY + 22}
                        fill="#f87171"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        -{hoveredExpenseTx.amount.toLocaleString('ru-RU')} ₽
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Step Junction Node at (cx, cy) on the step curve */}
              {isMixed ? (
                // Two-tone split beacon node for mixed days (Income + Expense)
                <g className="pointer-events-none">
                  {/* Upper green semi-circle */}
                  <path
                    d={`M ${cx - (isCompact ? 3.5 : 4.5)} ${cy} A ${isCompact ? 3.5 : 4.5} ${isCompact ? 3.5 : 4.5} 0 0 1 ${cx + (isCompact ? 3.5 : 4.5)} ${cy}`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={isCompact ? 2 : 2.5}
                  />
                  {/* Lower red semi-circle */}
                  <path
                    d={`M ${cx - (isCompact ? 3.5 : 4.5)} ${cy} A ${isCompact ? 3.5 : 4.5} ${isCompact ? 3.5 : 4.5} 0 0 0 ${cx + (isCompact ? 3.5 : 4.5)} ${cy}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={isCompact ? 2 : 2.5}
                  />
                  {/* Crisp center core */}
                  <circle cx={cx} cy={cy} r={isCompact ? 1.5 : 2} fill="#ffffff" />
                </g>
              ) : (
                // Clean anchor dot for single-direction flow days
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCompact ? 2 : 2.5}
                  fill={hasIncome ? '#22c55e' : '#ef4444'}
                  stroke="#ffffff"
                  strokeWidth={1}
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}

        {/* Main trend line (stepAfter) */}
        <path
          d={pathDefinition}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={isCompact ? '2.2' : '3'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active context menu target point marker */}
        {contextPoint && (
          (() => {
            const cx = getX(contextPoint.dayIndex);
            const cy = getY(contextPoint.closingBalance);
            return (
              <g>
                <line
                  x1={cx}
                  y1={paddingTop}
                  x2={cx}
                  y2={chartHeight - paddingBottom}
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCompact ? '5.5' : '7'}
                  fill="#a855f7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            );
          })()
        )}

        {/* Active hovered point cursor (synced with calendar table rows and chart hover) */}
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
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity={0.9}
              />
              <circle
                cx={hx}
                cy={hy}
                r={isCompact ? 5 : 6}
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth={2.5}
              />
            </g>
          );
        })()}
      </svg>

      {/* Floating 2-second hover hint badge near cursor (placed opposite to main tooltip to avoid overlapping) */}
      {showClickHint && hoveredPoint && (() => {
        const hintWidth = 320;
        const isTooltipVisible = !isCompact || showCompactTooltip;
        const isTooltipOnRight = tooltipPos.x >= mouseCoords.x;

        let hintLeft: number;
        if (isTooltipVisible) {
          if (isTooltipOnRight) {
            // Main tooltip is on right -> place hint on left if space permits
            hintLeft = mouseCoords.x - 16 - hintWidth >= 8
              ? mouseCoords.x - 16 - hintWidth
              : Math.max(8, mouseCoords.x - 18);
          } else {
            // Main tooltip is on left -> place hint on right if space permits
            hintLeft = mouseCoords.x + 16 + hintWidth <= dimensions.width - 8
              ? mouseCoords.x + 16
              : Math.max(8, mouseCoords.x - 18);
          }
        } else {
          hintLeft = mouseCoords.x + 18 + hintWidth <= dimensions.width
            ? mouseCoords.x + 18
            : Math.max(8, mouseCoords.x - 18 - hintWidth);
        }

        const hintTop = isCompact
          ? -26 // In compact mode dock above the plot line so it never clashes with the tooltip below
          : (mouseCoords.y >= 36 ? mouseCoords.y - 32 : mouseCoords.y + 16);

        return (
          <div
            className="absolute z-50 pointer-events-none px-2.5 py-1 rounded-md bg-slate-900/95 text-slate-100 text-[11px] font-medium border border-blue-500/40 shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-in fade-in duration-200 backdrop-blur-xs select-none"
            style={{
              left: `${hintLeft}px`,
              top: `${hintTop}px`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0"></span>
            <span>Нажмите на дату в графике для быстрой прокрутки к ней</span>
          </div>
        );
      })()}

      {/* Hover Tooltip with Data Enrichment (can be disabled in compact view to avoid duplicating rules list) */}
      {hoveredPoint && (!isCompact || showCompactTooltip) && (
        <div
          className="absolute p-3 rounded-lg border text-white shadow-2xl pointer-events-none z-50 select-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            borderColor: hoveredPoint.isCashGap ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.4)',
            backdropFilter: 'blur(12px)',
            width: '240px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>{hoveredPoint.date} ({hoveredPoint.dayOfWeek})</span>
            {hoveredPoint.isCashGap && (
              <span className="text-red-400 font-bold bg-red-950/80 px-1.5 py-0.5 rounded text-[10px]">
                РАЗРЫВ
              </span>
            )}
          </div>
          <div
            className={`text-lg font-bold border-b pb-1 mb-2 ${
              hoveredPoint.closingBalance < 0 ? 'text-red-400' : 'text-slate-100'
            }`}
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {hoveredPoint.closingBalance.toLocaleString('ru-RU')} ₽
          </div>

          {hoveredPoint.transactions.length > 0 ? (
            <div className="space-y-1 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                События дня:
              </div>
              {(isCompact ? hoveredPoint.transactions.slice(0, 3) : hoveredPoint.transactions).map((tx, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="truncate max-w-[130px] text-slate-300">
                    {tx.title}
                  </span>
                  <span
                    className={`font-semibold ${
                      tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {tx.amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
              {isCompact && hoveredPoint.transactions.length > 3 && (
                <div className="text-[10px] text-slate-400 italic text-right">
                  + еще {hoveredPoint.transactions.length - 3} (ЛКМ срез)
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">
              Без транзакций (баланс стабилен)
            </div>
          )}

          {/* Информационные подсказки ЛКМ и ПКМ */}
          <div className="pt-2 mt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5" title="Нажмите левую кнопку мыши для подробного среза дня">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-300 font-bold border border-blue-500/40 text-[10px]">
                ЛКМ
              </span>
              <span className="text-slate-300">срез дня</span>
            </span>
            <span className="flex items-center gap-1.5" title="Нажмите правую кнопку мыши для контекстного меню">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40 text-[10px]">
                ПКМ
              </span>
              <span className="text-slate-300">меню</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
