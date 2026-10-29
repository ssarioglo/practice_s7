import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Counterparty, TransactionRule, DailyPoint, ForecastConfig } from './types/finance.ts';
import {
  runCashFlowForecast,
  isRuleArchived,
  formatRecurrenceLabel,
  formatCategoryLabel,
} from './engine/forecast.ts';
import { ForecastChart } from './components/ForecastChart.tsx';
import { RuleModal } from './components/RuleModal.tsx';
import { DaySliceModal } from './components/DaySliceModal.tsx';
import { ContextMenu } from './components/ContextMenu.tsx';
import { RulesManager } from './components/RulesManager.tsx';
import { CalendarLedger } from './components/CalendarLedger.tsx';
import { ApiImportView } from './components/ApiImportView.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import { backendApi } from './services/api.ts';

const DEFAULT_START_DATE = '2026-04-01';
const DEFAULT_INITIAL_BALANCE = 2200000;

// стартовые контрагенты для примера
const INITIAL_COUNTERPARTIES: Counterparty[] = [
  {
    id: 'cp-1',
    name: 'ООО "СтройКомплект"',
    inn: '7701982341',
    type: 'CLIENT',
    contract: 'Договор поставки № 14 от 10.01.2026',
    accountNumber: '40702810100000001122',
  },
  {
    id: 'cp-2',
    name: 'АО "ТехноСнаб"',
    inn: '7705443322',
    type: 'VENDOR',
    contract: 'Договор № 08 от 15.01.2026',
    accountNumber: '40702810500000008899',
  },
  {
    id: 'cp-3',
    name: 'ООО "Бизнес-Парк"',
    inn: '7723123456',
    type: 'VENDOR',
    contract: 'Договор аренды № А-09',
    accountNumber: '40702810300000005544',
  },
  {
    id: 'cp-4',
    name: 'ИФНС России № 7 по г. Москве',
    inn: '7707083893',
    type: 'TAX',
    contract: 'Единый налоговый счет (ЕНС)',
    accountNumber: '03100643000000018500',
  },
];

// дефолтные операции (6 обычных и 1 старая для архива)
const INITIAL_RULES: TransactionRule[] = [
  {
    id: '1',
    title: 'Оплата от покупателя по договору поставки',
    amount: 2400000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    intervalType: 'MONTH',
    dayOfMonth: 15,
    category: 'OPERATIONAL',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    counterpartyId: 'cp-1',
    counterpartyName: 'ООО "СтройКомплект"',
    counterpartyInn: '7701982341',
    active: true,
  },
  {
    id: '2',
    title: 'Выручка от оптовых заказов',
    amount: 850000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    intervalType: 'BIWEEKLY',
    startDate: '2026-04-08',
    category: 'OPERATIONAL',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    counterpartyId: 'cp-1',
    counterpartyName: 'ООО "СтройКомплект"',
    counterpartyInn: '7701982341',
    active: true,
  },
  {
    id: '3',
    title: 'Закупка партии товара у поставщика',
    amount: 1500000,
    type: 'EXPENSE',
    recurrence: 'RECURRING',
    intervalType: 'MONTH',
    dayOfMonth: 5,
    category: 'OPERATIONAL',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    counterpartyId: 'cp-2',
    counterpartyName: 'АО "ТехноСнаб"',
    counterpartyInn: '7705443322',
    active: true,
  },
  {
    id: '4',
    title: 'Выплата зарплаты сотрудникам (ФОТ)',
    amount: 1800000,
    type: 'EXPENSE',
    recurrence: 'RECURRING',
    intervalType: 'MONTH',
    dayOfMonth: 10,
    category: 'PAYROLL',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    active: true,
  },
  {
    id: '5',
    title: 'Аренда офиса и склада',
    amount: 450000,
    type: 'EXPENSE',
    recurrence: 'RECURRING',
    intervalType: 'MONTH',
    dayOfMonth: 25,
    category: 'OPERATIONAL',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    counterpartyId: 'cp-3',
    counterpartyName: 'ООО "Бизнес-Парк"',
    counterpartyInn: '7723123456',
    active: true,
  },
  {
    id: '6',
    title: 'Уплата квартального налога',
    amount: 950000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-04-28',
    category: 'TAX',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    counterpartyId: 'cp-4',
    counterpartyName: 'ИФНС России № 7 по г. Москве',
    counterpartyInn: '7707083893',
    active: true,
  },
  {
    id: '7',
    title: 'Покупка складского оборудования (закрыто)',
    amount: 600000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-02-15',
    category: 'INVESTMENT',
    source: 'MANUAL',
    accountName: 'Р/с ••4812 (СберБизнес — Основной)',
    counterpartyId: 'cp-2',
    counterpartyName: 'АО "ТехноСнаб"',
    counterpartyInn: '7705443322',
    active: true,
  },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pym_corp_auth_v2') === 'true';
  });
  const [isBackendMode, setIsBackendMode] = useState<boolean>(false);
  const [userLogin, setUserLogin] = useState<string>(() => {
    return localStorage.getItem('pym_corp_login_v2') || 'sarioglo';
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('pym_corp_user_v2') || 'Сариогло С.Д.';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'calendar' | 'api'>(
    'dashboard'
  );

  const [initialBalance, setInitialBalance] = useState<number>(() => {
    const saved = localStorage.getItem('pym_corp_balance_v4');
    return saved !== null && !Number.isNaN(Number(saved))
      ? Number(saved)
      : DEFAULT_INITIAL_BALANCE;
  });
  const [startDate, setStartDate] = useState<string>(DEFAULT_START_DATE);
  const [daysToForecast, setDaysToForecast] = useState<ForecastConfig['period']>(60);

  const [counterparties, setCounterparties] = useState<Counterparty[]>(() => {
    const saved = localStorage.getItem('pym_corp_counterparties_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_COUNTERPARTIES;
  });

  const [rules, setRules] = useState<TransactionRule[]>(() => {
    const saved = localStorage.getItem('pym_corp_rules_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_RULES;
  });

  // подтягиваем данные с бэка если он запущен
  const syncFromBackend = useCallback(async () => {
    try {
      const state = await backendApi.state.get();
      setIsBackendMode(true);
      if (state.profile) {
        setInitialBalance(state.profile.initialBalance);
        setStartDate(state.profile.startDate || DEFAULT_START_DATE);
        const p = state.profile.period;
        if (p === 30 || p === 60 || p === 90 || p === 180) {
          setDaysToForecast(p);
        }
        if (state.profile.fullName) {
          setUserName(state.profile.fullName);
        }
      }
      if (Array.isArray(state.counterparties)) {
        setCounterparties(state.counterparties);
      }
      if (Array.isArray(state.rules)) {
        setRules(state.rules);
      }
    } catch (err: any) {
      if (err && err.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('pym_corp_auth_v2');
      } else {
        setIsBackendMode(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncFromBackend();
    }
  }, [isAuthenticated, syncFromBackend]);

  useEffect(() => {
    localStorage.setItem('pym_corp_balance_v4', initialBalance.toString());
  }, [initialBalance]);

  useEffect(() => {
    localStorage.setItem('pym_corp_counterparties_v4', JSON.stringify(counterparties));
  }, [counterparties]);

  useEffect(() => {
    localStorage.setItem('pym_corp_rules_v4', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('pym_corp_user_v2', userName);
    localStorage.setItem('pym_corp_login_v2', userLogin);
  }, [userName, userLogin]);

  const pushProfileUpdate = useCallback(
    async (nextBalance: number, nextStartDate: string, nextPeriod: ForecastConfig['period'], nextName: string) => {
      if (!isBackendMode) return;
      try {
        await backendApi.state.updateProfile({
          fullName: nextName,
          initialBalance: nextBalance,
          startDate: nextStartDate,
          period: nextPeriod,
        });
      } catch {
        // ничего не делаем
      }
    },
    [isBackendMode]
  );

  const handleResetDemoData = async () => {
    if (isBackendMode) {
      try {
        const state = await backendApi.state.resetDemoData();
        setInitialBalance(state.profile.initialBalance);
        setStartDate(state.profile.startDate);
        setDaysToForecast(state.profile.period);
        setCounterparties(state.counterparties);
        setRules(state.rules);
        return;
      } catch {
        // если отвалилось сбрасываем локально
      }
    }
    setInitialBalance(DEFAULT_INITIAL_BALANCE);
    setStartDate(DEFAULT_START_DATE);
    setDaysToForecast(60);
    setCounterparties(INITIAL_COUNTERPARTIES);
    setRules(INITIAL_RULES);
  };

  const handleLoginSuccess = (login: string, fullName: string, backendConnected: boolean) => {
    setUserLogin(login);
    setUserName(fullName);
    setIsBackendMode(backendConnected);
    setIsAuthenticated(true);
    localStorage.setItem('pym_corp_auth_v2', 'true');
  };

  const handleLogout = async () => {
    await backendApi.auth.logout();
    setIsAuthenticated(false);
    localStorage.removeItem('pym_corp_auth_v2');
  };

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [ruleModalInitialData, setRuleModalInitialData] = useState<{
    date?: string;
    type?: 'INCOME' | 'EXPENSE';
    rule?: TransactionRule;
  } | null>(null);

  const [selectedDaySlice, setSelectedDaySlice] = useState<DailyPoint | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dayData: DailyPoint;
  } | null>(null);

  const forecast = useMemo(() => {
    return runCashFlowForecast(
      {
        initialBalance,
        startDate,
        period: daysToForecast,
      },
      rules
    );
  }, [initialBalance, startDate, daysToForecast, rules]);

  const activeRules = useMemo(
    () => (Array.isArray(rules) ? rules.filter((r) => !isRuleArchived(r, startDate)) : []),
    [rules, startDate]
  );
  const archivedCount = (Array.isArray(rules) ? rules.length : 0) - activeRules.length;

  const handleSaveRule = async (ruleData: Omit<TransactionRule, 'id'>, id?: string) => {
    if (id) {
      const updatedObj: TransactionRule = { ...ruleData, id };
      setRules((prev) => prev.map((r) => (r.id === id ? updatedObj : r)));
      if (isBackendMode) {
        try {
          const saved = await backendApi.rules.update(updatedObj);
          setRules((prev) => prev.map((r) => (r.id === id ? saved : r)));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      if (isBackendMode) {
        try {
          const created = await backendApi.rules.create(ruleData);
          setRules((prev) => [...prev, created]);
          return;
        } catch (e) {
          console.error(e);
        }
      }
      const newRule: TransactionRule = {
        ...ruleData,
        id: Math.random().toString(36).substring(2, 9),
      };
      setRules((prev) => [...prev, newRule]);
    }
  };

  const handleUpdateRule = async (updated: TransactionRule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (isBackendMode) {
      try {
        await backendApi.rules.update(updated);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const toggled: TransactionRule = { ...target, active: !target.active };
    setRules((prev) => prev.map((r) => (r.id === id ? toggled : r)));
    if (isBackendMode) {
      try {
        await backendApi.rules.update(toggled);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteRule = async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (isBackendMode) {
      try {
        await backendApi.rules.delete(id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddCounterparty = (cpData: Omit<Counterparty, 'id'>): Counterparty => {
    const tempId = 'cp-' + Math.random().toString(36).substring(2, 8);
    const newCp: Counterparty = {
      ...cpData,
      id: tempId,
    };
    setCounterparties((prev) => [...prev, newCp]);

    if (isBackendMode) {
      backendApi.counterparties
        .create(cpData)
        .then((saved) => {
          setCounterparties((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
        })
        .catch(console.error);
    }
    return newCp;
  };

  const handleUpdateCounterparty = (updated: Counterparty) => {
    setCounterparties((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (isBackendMode) {
      backendApi.counterparties.update(updated).catch(console.error);
    }
  };

  const handleDeleteCounterparty = (id: string) => {
    setCounterparties((prev) => prev.filter((c) => c.id !== id));
    if (isBackendMode) {
      backendApi.counterparties.delete(id).catch(console.error);
    }
  };

  const handleImportPayload = (payload: {
    rules?: any[];
    counterparties?: Omit<Counterparty, 'id'>[];
  }) => {
    let addedCpCount = 0;
    let addedRulesCount = 0;

    const normalizedRules: Omit<TransactionRule, 'id'>[] = [];
    if (payload.rules && Array.isArray(payload.rules)) {
      for (const r of payload.rules) {
        addedRulesCount++;
        normalizedRules.push({
          title: r.title,
          amount: Math.abs(Number(r.amount) || 0),
          type: r.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
          recurrence: (r.recurrence || r.frequency) === 'RECURRING' ? 'RECURRING' : 'ONCE',
          intervalType: r.intervalType || r.recurrenceInterval || 'MONTH',
          customIntervalDays: r.customIntervalDays,
          dayOfMonth: r.dayOfMonth,
          date: r.date,
          startDate: r.startDate,
          endDate: r.endDate,
          category: r.category || 'OPERATIONAL',
          source: 'FILE_IMPORT',
          accountName: r.accountName || r.account || 'Р/с ••4812 (СберБизнес — Основной)',
          counterpartyId: r.counterpartyId,
          counterpartyName: r.counterpartyName,
          counterpartyInn: r.counterpartyInn,
          active: r.active !== false,
        });
      }
    }

    if (payload.counterparties && Array.isArray(payload.counterparties)) {
      addedCpCount = payload.counterparties.length;
    }

    if (isBackendMode) {
      backendApi.state
        .importPayload({
          counterparties: payload.counterparties,
          rules: normalizedRules,
        })
        .then((state) => {
          setCounterparties(state.counterparties);
          setRules(state.rules);
        })
        .catch(console.error);
    } else {
      if (payload.counterparties && Array.isArray(payload.counterparties)) {
        const newCps: Counterparty[] = payload.counterparties.map((cp) => ({
          ...cp,
          id: 'cp-' + Math.random().toString(36).substring(2, 8),
        }));
        setCounterparties((prev) => [...prev, ...newCps]);
      }
      if (normalizedRules.length > 0) {
        const withIds: TransactionRule[] = normalizedRules.map((r) => ({
          ...r,
          id: Math.random().toString(36).substring(2, 9),
        }));
        setRules((prev) => [...prev, ...withIds]);
      }
    }

    return { addedRules: addedRulesCount, addedCounterparties: addedCpCount };
  };

  const openAddRuleModal = (
    date?: string,
    type?: 'INCOME' | 'EXPENSE',
    rule?: TransactionRule
  ) => {
    setRuleModalInitialData({ date, type, rule });
    setIsRuleModalOpen(true);
    setContextMenu(null);
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#e9ecef] text-gray-900 font-sans text-xs">
      {/* шапка */}
      <header className="bg-[#2c3e50] text-white border-b-2 border-[#1a252f]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm bg-[#337ab7] px-2 py-0.5 border border-[#2e6da4]">
              АИС «PYM-Финанс» v1.4
            </span>
            <span className="font-bold text-sm">
              Планирование движения денежных средств организации
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-300">
              Пользователь: <strong className="text-white">{userName}</strong> ({userLogin})
            </span>
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="underline text-gray-200 hover:text-white cursor-pointer"
            >
              [Профиль]
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2 py-0.5 bg-[#d9534f] hover:bg-[#c9302c] text-white font-bold border border-[#ac2925] cursor-pointer"
            >
              Выход
            </button>
          </div>
        </div>

        {/* вкладки меню */}
        <div className="bg-[#f5f5f5] text-gray-800 border-t border-gray-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2 py-1.5">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 font-bold border cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                    : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
                }`}
              >
                1. Сводка и график (Дашборд)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 font-bold border cursor-pointer ${
                  activeTab === 'rules'
                    ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                    : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
                }`}
              >
                2. Правила & Транзакции ({activeRules.length} актив. / {archivedCount} арх.)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1.5 font-bold border cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                    : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
                }`}
              >
                3. Платежный календарь и Контрагенты ({counterparties.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className={`px-3 py-1.5 font-bold border cursor-pointer ${
                  activeTab === 'api'
                    ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                    : 'bg-white text-gray-800 border-gray-400 hover:bg-gray-100'
                }`}
              >
                4. Импорт / Экспорт (JSON)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-400 cursor-pointer"
                title="Сбросить таблицу к исходным контрольным данным"
              >
                Сброс демо-данных
              </button>
              <button
                type="button"
                onClick={() => openAddRuleModal()}
                className="px-3 py-1.5 bg-[#5cb85c] hover:bg-[#449d44] text-white font-bold border border-[#4cae4c] cursor-pointer"
              >
                + Новая операция
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {/* панель настроек периода */}
        <div className="bg-[#f5f5f5] border border-gray-400 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="font-bold text-gray-800 uppercase">
            Параметры расчетного периода:
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-700">Начальный остаток (руб.):</label>
              <input
                type="number"
                step="50000"
                value={initialBalance}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setInitialBalance(val);
                  pushProfileUpdate(val, startDate, daysToForecast, userName);
                }}
                className="w-36 px-2 py-1 bg-white border border-gray-400 font-mono font-bold text-gray-900 focus:outline-none focus:border-[#337ab7]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-700">Дата «Старт»:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  pushProfileUpdate(initialBalance, val, daysToForecast, userName);
                }}
                className="px-2 py-1 bg-white border border-gray-400 font-mono text-gray-900 focus:outline-none focus:border-[#337ab7]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-700">Горизонт прогноза:</label>
              <select
                value={daysToForecast}
                onChange={(e) => {
                  const val = Number(e.target.value) as ForecastConfig['period'];
                  setDaysToForecast(val);
                  pushProfileUpdate(initialBalance, startDate, val, userName);
                }}
                className="px-2 py-1 bg-white border border-gray-400 text-gray-900 focus:outline-none focus:border-[#337ab7]"
              >
                <option value={30}>30 дней (1 месяц)</option>
                <option value={60}>60 дней (2 месяца)</option>
                <option value={90}>90 дней (Квартал)</option>
                <option value={180}>180 дней (Полугодие)</option>
              </select>
            </div>
          </div>
        </div>

        {/* алерт если ушли в минус */}
        {forecast.summary.hasCashGap && (
          <div className="bg-[#f2dede] border-2 border-[#a94442] p-3 text-[#a94442]">
            <div className="font-bold text-sm mb-1">
              ВНИМАНИЕ! Зафиксирован кассовый разрыв (дефицит оборотных средств)!
            </div>
            <div>
              В выбранном горизонте прогнозирования остаток денежных средств опускается ниже нуля в
              течение <strong>{forecast.summary.gapDurationDays} дн.</strong> Первая дата кассового
              разрыва: <strong className="font-mono">{forecast.summary.firstGapDate}</strong>.
              Минимальный прогнозный баланс:{' '}
              <strong className="font-mono">
                {forecast.summary.minBalance.toLocaleString('ru-RU')} руб.
              </strong>{' '}
              Рекомендуется перенести дату списаний или привлечь финансирование до указанной даты.
            </div>
          </div>
        )}

        {/* вкладка 1 - дашборд */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-gray-400 p-3">
                <div className="text-gray-600 font-bold mb-1">
                  1. Текущий остаток на счетах:
                </div>
                <div className="text-base font-mono font-bold text-gray-900">
                  {initialBalance.toLocaleString('ru-RU')} руб.
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  База отсчета на дату {startDate}
                </div>
              </div>

              <div className="bg-white border border-gray-400 p-3">
                <div className="text-gray-600 font-bold mb-1">
                  2. Суммарный Приход (+):
                </div>
                <div className="text-base font-mono font-bold text-[#3c763d]">
                  +{forecast.summary.totalIncome.toLocaleString('ru-RU')} руб.
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  План поступлений за {daysToForecast} дн.
                </div>
              </div>

              <div className="bg-white border border-gray-400 p-3">
                <div className="text-gray-600 font-bold mb-1">
                  3. Суммарное Списание (-):
                </div>
                <div className="text-base font-mono font-bold text-[#a94442]">
                  -{forecast.summary.totalExpense.toLocaleString('ru-RU')} руб.
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  План расходов за {daysToForecast} дн.
                </div>
              </div>

              <div
                className={`border p-3 ${
                  forecast.summary.minBalance < 0
                    ? 'bg-[#f2dede] border-[#a94442]'
                    : 'bg-white border-gray-400'
                }`}
              >
                <div className="text-gray-700 font-bold mb-1">
                  4. Нижний пик ликвидности (Min):
                </div>
                <div
                  className={`text-base font-mono font-bold ${
                    forecast.summary.minBalance < 0 ? 'text-[#a94442]' : 'text-gray-900'
                  }`}
                >
                  {forecast.summary.minBalance.toLocaleString('ru-RU')} руб.
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Дата минимума:{' '}
                  <span className="font-mono">{forecast.summary.minBalanceDate || startDate}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white border border-gray-400 p-3 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-2 mb-3">
                  <div>
                    <h2 className="font-bold text-gray-800 uppercase">
                      График прогноза движения денежных средств (Cash Flow)
                    </h2>
                    <div className="text-[11px] text-gray-500">
                      ЛКМ по точке графика — выписка за день; ПКМ — меню добавления операции
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span>
                      <strong className="text-[#337ab7]">Синяя линия</strong> — остаток средств
                    </span>
                    <span>
                      <strong className="text-[#a94442]">Пунктир (0 ₽)</strong> — граница кассового
                      разрыва
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-[340px]">
                  <ForecastChart
                    points={forecast.points}
                    customHeight={340}
                    onSelectPoint={(pt) => setSelectedDaySlice(pt)}
                    onContextMenu={(pt, coords) =>
                      setContextMenu({ x: coords.x, y: coords.y, dayData: pt })
                    }
                  />
                </div>
              </div>

              <div className="bg-white border border-gray-400 flex flex-col max-h-[430px]">
                <div className="bg-[#eeeeee] px-3 py-2 border-b border-gray-400 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-800 uppercase">
                      Действующие правила ({activeRules.length})
                    </h2>
                    <div className="text-[11px] text-gray-600">
                      Архивные записи до {startDate} скрыты ({archivedCount} шт.)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rules')}
                    className="text-[#337ab7] hover:underline font-bold cursor-pointer"
                  >
                    [Все правила]
                  </button>
                </div>

                <div className="overflow-y-auto divide-y divide-gray-300">
                  {activeRules.map((rule) => (
                    <div
                      key={rule.id}
                      onClick={() => openAddRuleModal(undefined, undefined, rule)}
                      className="p-2.5 hover:bg-[#f9f9f9] cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{rule.title}</div>
                        {rule.counterpartyName && (
                          <div className="text-[11px] text-gray-600 truncate">
                            Контрагент: {rule.counterpartyName}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {formatRecurrenceLabel(rule)} | {formatCategoryLabel(rule.category)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold ${
                            rule.type === 'INCOME' ? 'text-[#3c763d]' : 'text-[#a94442]'
                          }`}
                        >
                          {rule.type === 'INCOME' ? '+' : '-'}
                          {rule.amount.toLocaleString('ru-RU')}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRule(rule.id);
                          }}
                          className="text-[11px] text-[#a94442] hover:underline mt-0.5 cursor-pointer"
                        >
                          [Удалить]
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* вкладка 2 - правила */}
        {activeTab === 'rules' && (
          <RulesManager
            rules={rules}
            isFullPage={true}
            defaultDate={startDate}
            forecastStartDate={startDate}
            counterparties={counterparties}
            onAddRule={(ruleData) => handleSaveRule(ruleData)}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
            onAddCounterparty={handleAddCounterparty}
            onUpdateCounterparty={handleUpdateCounterparty}
            onDeleteCounterparty={handleDeleteCounterparty}
          />
        )}

        {/* вкладка 3 - календарь и контрагенты */}
        {activeTab === 'calendar' && (
          <CalendarLedger
            points={forecast.points}
            rules={rules}
            counterparties={counterparties}
            onEditRule={(rule) => openAddRuleModal(undefined, undefined, rule)}
            onAddCounterparty={handleAddCounterparty}
            onDeleteCounterparty={handleDeleteCounterparty}
          />
        )}

        {/* вкладка 4 - импорт/экспорт */}
        {activeTab === 'api' && (
          <ApiImportView
            rules={rules}
            counterparties={counterparties}
            onImportPayload={handleImportPayload}
          />
        )}
      </main>

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onSaveRule={handleSaveRule}
        counterparties={counterparties}
        onAddCounterparty={handleAddCounterparty}
        defaultDate={startDate}
        forecastStartDate={startDate}
        editingRule={ruleModalInitialData?.rule || null}
        prefillData={
          ruleModalInitialData && !ruleModalInitialData.rule
            ? { date: ruleModalInitialData.date, type: ruleModalInitialData.type }
            : null
        }
      />

      <DaySliceModal
        isOpen={!!selectedDaySlice}
        onClose={() => setSelectedDaySlice(null)}
        dayData={selectedDaySlice}
        onAddTransaction={(date) => openAddRuleModal(date)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userName={userName}
        onSaveUserName={(newName) => {
          setUserName(newName);
          pushProfileUpdate(initialBalance, startDate, daysToForecast, newName);
        }}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          date={contextMenu.dayData.date}
          onClose={() => setContextMenu(null)}
          onAddIncome={() => openAddRuleModal(contextMenu.dayData.date, 'INCOME')}
          onAddExpense={() => openAddRuleModal(contextMenu.dayData.date, 'EXPENSE')}
          onInspectDay={() => {
            setSelectedDaySlice(contextMenu.dayData);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
