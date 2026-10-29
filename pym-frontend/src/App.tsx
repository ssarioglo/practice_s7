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
import { backendApi, setAuthToken } from './services/api.ts';

const DEFAULT_START_DATE = '2026-04-01';
const DEFAULT_INITIAL_BALANCE = 2200000;

// главный компонент приложения (боевой режим — все данные читаются и пишутся напрямую в postgresql)
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('pym_corp_auth_v2') === 'true';
  });
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string>('');

  const [userLogin, setUserLogin] = useState<string>(() => {
    return localStorage.getItem('pym_corp_login_v2') || 'sarioglo';
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('pym_corp_user_v2') || 'Сариогло С.Д.';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'rules' | 'calendar' | 'api'>(
    'dashboard'
  );

  const [initialBalance, setInitialBalance] = useState<number>(DEFAULT_INITIAL_BALANCE);
  const [startDate, setStartDate] = useState<string>(DEFAULT_START_DATE);
  const [daysToForecast, setDaysToForecast] = useState<ForecastConfig['period']>(60);

  // массивы контрагентов и операций загружаются из базы данных postgresql
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [rules, setRules] = useState<TransactionRule[]>([]);

  // загружаем состояние пользователя напрямую из бд через pym-gateway -> pym-data-service
  const syncFromBackend = useCallback(async () => {
    setIsLoadingState(true);
    setDbError('');
    try {
      const state = await backendApi.state.get();
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
      setCounterparties(Array.isArray(state.counterparties) ? state.counterparties : []);
      setRules(Array.isArray(state.rules) ? state.rules : []);
    } catch (err: any) {
      if (err && err.status === 401) {
        setAuthToken(null);
        setIsAuthenticated(false);
        localStorage.removeItem('pym_corp_auth_v2');
      } else {
        setDbError(err?.message || 'Ошибка получения данных из СУБД PostgreSQL');
      }
    } finally {
      setIsLoadingState(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncFromBackend();
    }
  }, [isAuthenticated, syncFromBackend]);

  useEffect(() => {
    localStorage.setItem('pym_corp_user_v2', userName);
    localStorage.setItem('pym_corp_login_v2', userLogin);
  }, [userName, userLogin]);

  // сохранение настроек профиля в бд
  const pushProfileUpdate = useCallback(
    async (
      nextBalance: number,
      nextStartDate: string,
      nextPeriod: ForecastConfig['period'],
      nextName: string
    ) => {
      try {
        await backendApi.state.updateProfile({
          fullName: nextName,
          initialBalance: nextBalance,
          startDate: nextStartDate,
          period: nextPeriod,
        });
      } catch (e: any) {
        console.error('ошибка сохранения профиля в бд:', e);
      }
    },
    []
  );

  // сброс к исходным контрольным данным в самой бд
  const handleResetDemoData = async () => {
    setDbError('');
    try {
      const state = await backendApi.state.resetDemoData();
      setInitialBalance(state.profile.initialBalance);
      setStartDate(state.profile.startDate);
      setDaysToForecast(state.profile.period);
      setCounterparties(state.counterparties);
      setRules(state.rules);
    } catch (e: any) {
      setDbError(e?.message || 'Не удалось перезаписать контрольные данные в БД');
    }
  };

  const handleLoginSuccess = (login: string, fullName: string) => {
    setUserLogin(login);
    setUserName(fullName);
    setIsAuthenticated(true);
    localStorage.setItem('pym_corp_auth_v2', 'true');
  };

  const handleLogout = async () => {
    await backendApi.auth.logout();
    setIsAuthenticated(false);
    setCounterparties([]);
    setRules([]);
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

  // создание или обновление правила в бд
  const handleSaveRule = async (ruleData: Omit<TransactionRule, 'id'>, id?: string) => {
    setDbError('');
    try {
      if (id) {
        const updatedObj: TransactionRule = { ...ruleData, id };
        const saved = await backendApi.rules.update(updatedObj);
        setRules((prev) => prev.map((r) => (r.id === id ? saved : r)));
      } else {
        const created = await backendApi.rules.create(ruleData);
        setRules((prev) => [...prev, created]);
      }
    } catch (e: any) {
      setDbError(e?.message || 'Ошибка сохранения операции в БД');
    }
  };

  const handleUpdateRule = async (updated: TransactionRule) => {
    setDbError('');
    try {
      const saved = await backendApi.rules.update(updated);
      setRules((prev) => prev.map((r) => (r.id === updated.id ? saved : r)));
    } catch (e: any) {
      setDbError(e?.message || 'Ошибка обновления операции в БД');
    }
  };

  const handleToggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const toggled: TransactionRule = { ...target, active: !target.active };
    setRules((prev) => prev.map((r) => (r.id === id ? toggled : r)));
    try {
      await backendApi.rules.update(toggled);
    } catch (e: any) {
      setDbError(e?.message || 'Ошибка переключения статуса операции в БД');
    }
  };

  const handleDeleteRule = async (id: string) => {
    setDbError('');
    try {
      await backendApi.rules.delete(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setDbError(e?.message || 'Ошибка удаления операции из БД');
    }
  };

  // добавление контрагента в бд
  const handleAddCounterparty = (cpData: Omit<Counterparty, 'id'>): Counterparty => {
    const tempId = 'temp-' + Date.now();
    const optimisticCp: Counterparty = {
      ...cpData,
      id: tempId,
    };
    setCounterparties((prev) => [...prev, optimisticCp]);

    backendApi.counterparties
      .create(cpData)
      .then((saved) => {
        setCounterparties((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
      })
      .catch((e: any) => {
        setCounterparties((prev) => prev.filter((c) => c.id !== tempId));
        setDbError(e?.message || 'Ошибка сохранения контрагента в БД');
      });

    return optimisticCp;
  };

  const handleUpdateCounterparty = (updated: Counterparty) => {
    setCounterparties((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    backendApi.counterparties.update(updated).catch((e: any) => {
      setDbError(e?.message || 'Ошибка обновления контрагента в БД');
    });
  };

  const handleDeleteCounterparty = (id: string) => {
    backendApi.counterparties
      .delete(id)
      .then(() => {
        setCounterparties((prev) => prev.filter((c) => c.id !== id));
      })
      .catch((e: any) => {
        setDbError(e?.message || 'Ошибка удаления контрагента из БД');
      });
  };

  // пакетный импорт json в бд
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

    backendApi.state
      .importPayload({
        counterparties: payload.counterparties,
        rules: normalizedRules,
      })
      .then((state) => {
        setCounterparties(state.counterparties);
        setRules(state.rules);
      })
      .catch((e: any) => {
        setDbError(e?.message || 'Ошибка импорта данных в БД');
      });

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
                title="Перезаписать контрольные тестовые данные в БД"
              >
                Сброс тестовых данных БД
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
        {dbError && (
          <div className="bg-[#f2dede] border border-[#a94442] p-2.5 text-[#a94442] flex items-center justify-between">
            <span>
              <strong>Ошибка БД:</strong> {dbError}
            </span>
            <button
              type="button"
              onClick={() => syncFromBackend()}
              className="px-2 py-0.5 bg-white border border-[#a94442] text-[#a94442] font-bold cursor-pointer"
            >
              Повторить запрос
            </button>
          </div>
        )}

        {isLoadingState && rules.length === 0 && (
          <div className="bg-white border border-gray-400 p-4 text-center text-gray-700 font-bold">
            Загрузка данных из СУБД PostgreSQL...
          </div>
        )}

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
