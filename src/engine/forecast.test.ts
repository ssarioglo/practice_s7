import test from 'node:test';
import assert from 'node:assert/strict';
import { runCashFlowForecast, getDaysInMonth, isRuleArchived } from './forecast.ts';
import { TransactionRule } from '../types/finance.ts';

test('getDaysInMonth handles regular and leap months', () => {
  assert.equal(getDaysInMonth(2026, 1), 31);
  assert.equal(getDaysInMonth(2026, 2), 28);
  assert.equal(getDaysInMonth(2024, 2), 29); // leap year
  assert.equal(getDaysInMonth(2026, 4), 30);
});

test('Predictor engine calculates recurring income and detects cash gap at 0 limit', () => {
  const rules: TransactionRule[] = [
    {
      id: '1',
      title: 'Выручка по эквайрингу',
      amount: 100000,
      type: 'INCOME',
      recurrence: 'RECURRING',
      intervalType: 'MONTH',
      dayOfMonth: 10,
      category: 'OPERATIONAL',
      source: 'MANUAL',
      active: true,
    },
    {
      id: '2',
      title: 'Аренда облачного ЦОД',
      amount: 80000,
      type: 'EXPENSE',
      recurrence: 'RECURRING',
      intervalType: 'MONTH',
      dayOfMonth: 5,
      category: 'OPERATIONAL',
      source: 'MANUAL',
      active: true,
    },
    {
      id: '3',
      title: 'Закупка серверного оборудования',
      amount: 70000,
      type: 'EXPENSE',
      recurrence: 'ONCE',
      date: '2026-05-02',
      category: 'INVESTMENT',
      source: 'MANUAL',
      active: true,
    },
  ];

  const result = runCashFlowForecast(
    {
      initialBalance: 30000,
      startDate: '2026-05-01',
      period: 30,
    },
    rules
  );

  assert.equal(result.points.length, 30);
  assert.equal(result.points[0].openingBalance, 30000);

  // On 2026-05-02, 70000 expense happens with starting 30000 -> balance becomes -40000 (Cash Gap!)
  assert.equal(result.points[1].date, '2026-05-02');
  assert.equal(result.points[1].closingBalance, -40000);
  assert.equal(result.points[1].isCashGap, true);
  assert.equal(result.summary.hasCashGap, true);
  assert.equal(result.summary.daysUntilGap, 1);
});

test('Flexible recurrence intervals: WEEK, BIWEEKLY, CUSTOM_DAYS (every 3 days)', () => {
  const rules: TransactionRule[] = [
    {
      id: 'custom-3d',
      title: 'Зачисление по СБП (раз в 3 дня)',
      amount: 10000,
      type: 'INCOME',
      recurrence: 'RECURRING',
      intervalType: 'CUSTOM_DAYS',
      customIntervalDays: 3,
      startDate: '2026-10-01',
      category: 'OPERATIONAL',
      source: 'MANUAL',
      active: true,
    },
  ];

  const result = runCashFlowForecast(
    {
      initialBalance: 0,
      startDate: '2026-10-01',
      period: 30,
    },
    rules
  );

  // In 30 days starting at day 0 with step 3: days 0, 3, 6, 9, 12, 15, 18, 21, 24, 27 -> 10 triggers
  assert.equal(result.summary.totalIncome, 100000);
});

test('isRuleArchived identifies past rules before forecastStartDate', () => {
  const pastOnce: TransactionRule = {
    id: 'past-1',
    title: 'Старый платеж',
    amount: 50000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-10-10',
    category: 'OPERATIONAL',
    source: 'MANUAL',
    active: true,
  };

  assert.equal(isRuleArchived(pastOnce, '2026-10-24'), true);
  assert.equal(isRuleArchived(pastOnce, '2026-10-01'), false);
});
