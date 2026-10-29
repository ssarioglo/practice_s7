import test from 'node:test';
import assert from 'node:assert/strict';
import { runCashFlowForecast, getDaysInMonth } from './forecast.ts';
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
      title: 'Зарплата',
      amount: 100000,
      type: 'INCOME',
      recurrence: 'RECURRING',
      dayOfMonth: 10,
      category: 'COMMON',
      source: 'MANUAL',
      active: true,
    },
    {
      id: '2',
      title: 'Аренда жилья',
      amount: 80000,
      type: 'EXPENSE',
      recurrence: 'RECURRING',
      dayOfMonth: 5,
      category: 'COMMON',
      source: 'MANUAL',
      active: true,
    },
    {
      id: '3',
      title: 'Крупная разовая покупка',
      amount: 70000,
      type: 'EXPENSE',
      recurrence: 'ONCE',
      date: '2026-05-02',
      category: 'COMMON',
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

test('Recurring rule with endDate respects loan maturity', () => {
  const rules: TransactionRule[] = [
    {
      id: '1',
      title: 'Кредит авто',
      amount: 15000,
      type: 'EXPENSE',
      recurrence: 'RECURRING',
      dayOfMonth: 15,
      endDate: '2026-06-01', // Should not apply in June or later
      category: 'CREDIT',
      source: 'MANUAL',
      active: true,
    },
  ];

  const result = runCashFlowForecast(
    {
      initialBalance: 50000,
      startDate: '2026-05-01',
      period: 60,
    },
    rules
  );

  // In May (index 14 = 2026-05-15) it should trigger
  const mayPayment = result.points.find((p) => p.date === '2026-05-15');
  assert.ok(mayPayment);
  assert.equal(mayPayment.expenseTotal, 15000);

  // In June (2026-06-15) it should NOT trigger because endDate is 2026-06-01
  const junePayment = result.points.find((p) => p.date === '2026-06-15');
  assert.ok(junePayment);
  assert.equal(junePayment.expenseTotal, 0);
});
