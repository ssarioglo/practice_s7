import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Settings,
  ShieldCheck,
  CreditCard,
  PlusCircle,
  Database,
  ArrowRight,
  Sparkles,
  BarChart3,
  Server,
  FileCode,
  MousePointerClick,
  Download,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ForecastChart } from './components/ForecastChart.tsx';
import { RulesManager } from './components/RulesManager.tsx';
import { CalendarLedger } from './components/CalendarLedger.tsx';
import { RuleModal } from './components/RuleModal.tsx';
import { ArchitectureView } from './components/ArchitectureView.tsx';
import { ContextMenu } from './components/ContextMenu.tsx';
import { DaySliceModal } from './components/DaySliceModal.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { TransactionRule, ForecastConfig, DailyPoint, UserProfile, TransactionType } from './types/finance.ts';
import { runCashFlowForecast } from './engine/forecast.ts';

const PROFILE_STORAGE_KEY = 'pym_user_profile_v2';
const RULES_STORAGE_KEY = 'pym_finance_rules_v2';
const SIDEBAR_COLLAPSED_KEY = 'pym_sidebar_collapsed';
const SHOW_METRICS_KEY = 'pym_show_metrics';

export const DEFAULT_PROFILE: UserProfile = {
  id: 101,
  email: 'swdross@gmail.com',
  fullName: 'Пользователь PYM',
  initialBalance: 195000,
  startDate: '2026-10-24',
  period: 90,
  safetyBuffer: 20000,
  autoTodayStart: false,
  currency: 'RUB',
  updatedAt: new Date().toISOString(),
  enableChartCollapse: true,
  showCompactTooltip: false,
};

// Реальные финансовые правила пользователя из экспорта Excel (старт: 24.10.2026, баланс: 195 000 ₽)
export const INITIAL_RULES: TransactionRule[] = [
  // 1. Регулярные доходы
  {
    id: 'rule-user-1',
    title: 'Зарплата (Основная часть)',
    amount: 100000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    dayOfMonth: 10,
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-2',
    title: 'Аванс',
    amount: 45000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    dayOfMonth: 25,
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-3',
    title: 'Аня зп',
    amount: 50000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    dayOfMonth: 7,
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-4',
    title: 'Аня аванс',
    amount: 40000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    dayOfMonth: 24,
    startDate: '2026-11-01',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-5',
    title: 'Рост?',
    amount: 50000,
    type: 'INCOME',
    recurrence: 'RECURRING',
    dayOfMonth: 29,
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },

  // 2. Регулярные расходы
  {
    id: 'rule-user-6',
    title: 'Ипотека',
    amount: 19500,
    type: 'EXPENSE',
    recurrence: 'RECURRING',
    dayOfMonth: 24,
    startDate: '2026-11-01',
    category: 'CREDIT',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-7',
    title: 'Платежи (обязательные)',
    amount: 18500,
    type: 'EXPENSE',
    recurrence: 'RECURRING',
    dayOfMonth: 7,
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },

  // 3. Разовые операции из графика
  {
    id: 'rule-user-8',
    title: 'Рост? (бонус октябрь)',
    amount: 55000,
    type: 'INCOME',
    recurrence: 'ONCE',
    date: '2026-10-31',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-9',
    title: 'Аня',
    amount: 60000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-10-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-10',
    title: 'Погашение кредита',
    amount: 298000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-11-23',
    category: 'CREDIT',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-11',
    title: 'Аня',
    amount: 40000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-11-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-12',
    title: 'Досрочное погашение',
    amount: 20000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-11-29',
    category: 'CREDIT',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-13',
    title: 'Аня',
    amount: 40000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-12-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-14',
    title: 'Досрочное погашение',
    amount: 20000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2026-12-29',
    category: 'CREDIT',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-15',
    title: 'Аня',
    amount: 40000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2027-01-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-16',
    title: 'Аня',
    amount: 40000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2027-02-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-17',
    title: 'Аня',
    amount: 40000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2027-03-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
  {
    id: 'rule-user-18',
    title: 'Аня',
    amount: 40000,
    type: 'EXPENSE',
    recurrence: 'ONCE',
    date: '2027-04-25',
    category: 'COMMON',
    source: 'MANUAL',
    active: true,
  },
];

function getInitialProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading saved profile:', e);
  }
  return DEFAULT_PROFILE;
}

function getInitialRules(): TransactionRule[] {
  try {
    const saved = localStorage.getItem(RULES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved rules:', e);
  }
  return INITIAL_RULES;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'gaps' | 'architecture'>('dashboard');
  const rulesSectionRef = useRef<HTMLDivElement>(null);
  const chartCardRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Persistent Sidebar State (Jira-style collapse)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persistent Metric Cards visibility
  const [showMetricCards, setShowMetricCards] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SHOW_METRICS_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (e) {
        console.warn('Failed to save sidebar state:', e);
      }
      return next;
    });
  };

  const toggleMetricCards = () => {
    setShowMetricCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_METRICS_KEY, String(next));
      } catch (e) {
        console.warn('Failed to save metrics visibility:', e);
      }
      return next;
    });
  };

  // Persistent User Profile and Rules state
  const [profile, setProfile] = useState<UserProfile>(getInitialProfile);
  const [rules, setRules] = useState<TransactionRule[]>(getInitialRules);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Selected date synchronization across Chart and Calendar Ledger
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarScrollTrigger, setCalendarScrollTrigger] = useState<number>(0);
  const [isRadarCollapsed, setIsRadarCollapsed] = useState<boolean>(false);
  const [isRulesCollapsed, setIsRulesCollapsed] = useState<boolean>(true);
  const [dashboardChartHeight, setDashboardChartHeight] = useState<number>(340);

  // Global Rule Modal state (used by Calendar Ledger and Context Menu)
  const [calendarModalState, setCalendarModalState] = useState<{
    isOpen: boolean;
    editingRule: TransactionRule | null;
    prefillData: { date?: string; type?: TransactionType; title?: string } | null;
  }>({
    isOpen: false,
    editingRule: null,
    prefillData: null,
  });

  const initialBalance = profile.initialBalance;
  const startDate = profile.startDate;
  const period = profile.period;

  const updateProfileField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setProfile((prev) => {
      const updated = { ...prev, [field]: value, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist profile:', e);
      }
      return updated;
    });
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn('Failed to persist profile:', e);
    }
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleResetToDefaults = () => {
    setProfile(DEFAULT_PROFILE);
    setRules(INITIAL_RULES);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE));
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(INITIAL_RULES));
    } catch (e) {
      console.warn('Failed to reset storage:', e);
    }
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  // Sync rules to localStorage on modification
  useEffect(() => {
    try {
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    } catch (e) {
      console.warn('Failed to persist rules:', e);
    }
  }, [rules]);

  const [hoveredPoint, setHoveredPoint] = useState<DailyPoint | null>(null);
  const [hoveredRuleId, setHoveredRuleId] = useState<string | null>(null);

  // Context menu state for right-click on chart
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    point: DailyPoint | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  });

  const [daySlicePoint, setDaySlicePoint] = useState<DailyPoint | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [rulePrefill, setRulePrefill] = useState<{
    date?: string;
    type?: 'INCOME' | 'EXPENSE';
    title?: string;
  } | null>(null);

  const handleChartContextMenu = (point: DailyPoint, coords: { x: number; y: number }) => {
    setContextMenu({
      visible: true,
      x: coords.x,
      y: coords.y,
      point,
    });
  };

  const handleContextMenuAddRule = (point: DailyPoint, flowType?: 'INCOME' | 'EXPENSE') => {
    setRulePrefill({
      date: point.date,
      type: flowType || 'EXPENSE',
      title: flowType === 'INCOME' ? 'Поступление средств' : 'Внеплановый расход',
    });
    setIsRuleModalOpen(true);
  };

  const handleContextMenuViewDaySlice = (point: DailyPoint) => {
    setDaySlicePoint(point);
  };

  const handleNavToDashboard = () => {
    setActiveTab('dashboard');
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavToCalendar = () => {
    setActiveTab('calendar');
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateRule = (updatedRule: TransactionRule) => {
    setRules((prev) => prev.map((r) => (r.id === updatedRule.id ? updatedRule : r)));
  };

  const handleAddRule = (newRuleData: Omit<TransactionRule, 'id'>) => {
    const newRule: TransactionRule = {
      ...newRuleData,
      id: `rule-${Date.now()}`,
    };
    setRules((prev) => [newRule, ...prev]);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  // Handlers for Calendar Ledger rule modal operations
  const handleOpenAddRuleAtDate = (targetDate: string, flowType?: TransactionType) => {
    setCalendarModalState({
      isOpen: true,
      editingRule: null,
      prefillData: {
        date: targetDate,
        type: flowType || 'EXPENSE',
        title: '',
      },
    });
  };

  const handleOpenEditRule = (rule: TransactionRule) => {
    setCalendarModalState({
      isOpen: true,
      editingRule: rule,
      prefillData: null,
    });
  };

  const handleSaveRuleFromModal = (ruleData: Omit<TransactionRule, 'id'>, existingId?: string) => {
    if (existingId) {
      handleUpdateRule({ ...ruleData, id: existingId });
    } else {
      handleAddRule(ruleData);
    }
  };

  // Compute cash flow using Python-compatible forecast engine
  const forecastResult = useMemo(() => {
    const config: ForecastConfig = {
      initialBalance,
      startDate,
      period,
    };
    return runCashFlowForecast(config, rules);
  }, [initialBalance, startDate, period, rules]);

  const { points, summary } = forecastResult;

  // Chart becomes compact (minimized) when rules are expanded, and full-sized when rules are collapsed
  const isChartCompact = profile.enableChartCollapse !== false ? !isRulesCollapsed : false;

  // Dynamic scaling of chart height on dashboard when rules are collapsed:
  // Ensures the collapsed "Финансовые правила и обязательства" bar stays visible above the bottom edge of the frame
  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    const calculateDynamicChartHeight = () => {
      const container = mainScrollRef.current;
      const containerHeight = container?.clientHeight || window.innerHeight - 80;

      if (!isRulesCollapsed) {
        // When expanded, chart is compact (120px) so height budget isn't constrained
        setDashboardChartHeight(360);
        return;
      }

      // Height used by other elements in <main> when rules are collapsed:
      let usedHeight = 32; // container padding (py-4)
      if (summary.hasCashGap) usedHeight += 68; // alert banner
      if (showMetricCards) usedHeight += 78; // 3 Fintech KPI Cards (1 row on sm+)
      usedHeight += 54; // collapsed RulesManager header bar
      usedHeight += 20; // space-y gaps
      usedHeight += 72; // chart card chrome (header & p-4 padding)

      const availableHeight = containerHeight - usedHeight;
      // Clamp between min 160px and max 380px
      const targetHeight = Math.max(160, Math.min(380, availableHeight));
      setDashboardChartHeight(targetHeight);
    };

    calculateDynamicChartHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mainScrollRef.current) {
      resizeObserver = new ResizeObserver(() => {
        calculateDynamicChartHeight();
      });
      resizeObserver.observe(mainScrollRef.current);
    }

    window.addEventListener('resize', calculateDynamicChartHeight);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', calculateDynamicChartHeight);
    };
  }, [activeTab, isRulesCollapsed, summary.hasCashGap, showMetricCards]);

  // Unified Start Block (Старт: Дата + Баланс)
  const renderStartBlock = () => (
    <div
      className="flex items-center gap-1.5 sm:gap-2 bg-slate-100/90 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-lg text-xs"
      title="Стартовые параметры прогноза (сохраняются в профиле)"
    >
      <div className="hidden sm:flex items-center gap-1 text-slate-700 font-bold text-xs pr-0.5">
        <Calendar size={13} className="text-blue-600" />
        <span>Старт</span>
      </div>

      {/* Дата */}
      <div className="flex items-center gap-1 bg-white px-1.5 sm:px-2 py-1 rounded-md border border-slate-200 shadow-2xs hover:border-blue-400 transition">
        <span className="text-slate-400 font-medium text-[10px] sm:text-[11px]">Дата:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => updateProfileField('startDate', e.target.value)}
          className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
        />
      </div>

      {/* Баланс */}
      <div className="flex items-center gap-1 bg-white px-1.5 sm:px-2 py-1 rounded-md border border-slate-200 shadow-2xs hover:border-blue-400 transition">
        <span className="text-slate-400 font-medium text-[10px] sm:text-[11px]">Баланс:</span>
        <input
          type="number"
          step="1000"
          value={initialBalance}
          onChange={(e) => updateProfileField('initialBalance', parseFloat(e.target.value) || 0)}
          className="w-20 sm:w-24 bg-transparent font-bold text-slate-800 font-mono focus:outline-none text-xs"
        />
        <span className="text-slate-400 font-medium text-xs">₽</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden">
      {/* Collapsible Sidebar (Jira-style) */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 shadow-md transition-all duration-300 ease-in-out select-none relative z-30`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 sm:h-16 flex items-center border-b border-slate-800/80 bg-slate-950/40 px-3.5 ${
            isSidebarCollapsed ? 'justify-center' : 'px-5 gap-3'
          }`}
        >
          <div
            className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0 cursor-pointer"
            onClick={toggleSidebarCollapse}
            title={isSidebarCollapsed ? 'Нажмите, чтобы развернуть меню' : 'PYM Plan Your Money'}
          >
            P
          </div>
          {!isSidebarCollapsed && (
            <div className="truncate animate-in fade-in duration-200">
              <div className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
                PYM{' '}
                <span className="text-[10px] bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                  v1.0
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-normal truncate">Plan Your Money</div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 py-3 px-2 sm:px-2.5 space-y-1 overflow-y-auto">
          {!isSidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Финансовый радар
            </div>
          )}

          {/* 1. Cash Flow Forecast Tab */}
          <button
            onClick={handleNavToDashboard}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition cursor-pointer group ${
              isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            } ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Cash Flow Прогноз"
          >
            <TrendingUp size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Cash Flow Прогноз</span>}
          </button>

          {/* 2. Excel-Style Calendar & Rules Tab */}
          <button
            onClick={handleNavToCalendar}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition cursor-pointer group ${
              isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            } ${
              activeTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={`Правила и транзакции (${rules.length})`}
          >
            <CreditCard size={18} className="shrink-0" />
            {!isSidebarCollapsed && (
              <>
                <span className="truncate">Правила & Транзакции</span>
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full font-mono transition-colors shrink-0 ${
                    activeTab === 'calendar' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {rules.length}
                </span>
              </>
            )}
          </button>

          {/* 3. Cash Gaps */}
          <button
            onClick={() => setActiveTab('gaps')}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition cursor-pointer group ${
              isSidebarCollapsed ? 'justify-center p-2.5 relative' : 'gap-3 px-3 py-2.5'
            } ${
              activeTab === 'gaps'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={summary.hasCashGap ? 'Внимание! Обнаружен кассовый разрыв' : 'Кассовые Разрывы'}
          >
            <AlertTriangle
              size={18}
              className={`shrink-0 ${summary.hasCashGap ? 'text-amber-400 animate-pulse' : ''}`}
            />
            {!isSidebarCollapsed ? (
              <>
                <span className="truncate">Кассовые Разрывы</span>
                {summary.hasCashGap && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold shrink-0">
                    GAP
                  </span>
                )}
              </>
            ) : (
              summary.hasCashGap && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              )
            )}
          </button>

          {/* Divider */}
          <div className="pt-3 pb-1">
            <div className="border-t border-slate-800/80 mx-2"></div>
          </div>

          {!isSidebarCollapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Системная архитектура
            </div>
          )}

          {/* 4. Architecture & Thesis */}
          <button
            onClick={() => setActiveTab('architecture')}
            className={`w-full flex items-center rounded-lg text-sm font-medium transition cursor-pointer group ${
              isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
            } ${
              activeTab === 'architecture'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Архитектура & Диплом"
          >
            <Layers size={18} className="shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Архитектура & Диплом</span>}
          </button>
        </div>

        {/* Microservices Footer Status */}
        {!isSidebarCollapsed ? (
          <div className="p-3 m-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5 animate-in fade-in duration-200">
            <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Server size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">Топология (Docker)</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px]">
              <span>Gateway :9800</span>
              <span className="text-emerald-400 font-mono">ONLINE</span>
            </div>
            <div className="flex justify-between items-center text-[10.5px]">
              <span>Predictor :9802</span>
              <span className="text-emerald-400 font-mono">ONLINE</span>
            </div>
          </div>
        ) : (
          <div className="p-2 flex justify-center" title="Docker сервисы: Gateway :9800, Predictor :9802 ONLINE">
            <div className="w-8 h-8 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-center text-emerald-400 relative">
              <Server size={14} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
          </div>
        )}

        {/* Jira-Style Sidebar Collapse Toggle Button at Bottom */}
        <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={toggleSidebarCollapse}
            className={`w-full flex items-center py-2 px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs font-semibold ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={isSidebarCollapsed ? 'Развернуть меню (>>)' : 'Свернуть меню (<<)'}
          >
            {!isSidebarCollapsed && <span>Свернуть меню</span>}
            {isSidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar: Clean, single-line, perfectly balanced without awkward wrapping */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shadow-2xs shrink-0 gap-3">
          {/* Left: Current Tab indicator with icon appears when menu is collapsed; when menu is expanded, Start Block moves here */}
          <div className="flex items-center gap-2.5 min-w-0">
            {isSidebarCollapsed ? (
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap animate-in fade-in duration-200">
                {activeTab === 'dashboard' && (
                  <>
                    <TrendingUp size={18} className="text-blue-600 shrink-0" />
                    <span>Cash Flow Прогноз</span>
                  </>
                )}
                {activeTab === 'calendar' && (
                  <>
                    <CreditCard size={18} className="text-blue-600 shrink-0" />
                    <span>Правила & Транзакции</span>
                  </>
                )}
                {activeTab === 'gaps' && (
                  <>
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <span>Кассовые Разрывы</span>
                  </>
                )}
                {activeTab === 'architecture' && (
                  <>
                    <Layers size={18} className="text-blue-600 shrink-0" />
                    <span>Архитектура & Диплом</span>
                  </>
                )}
              </div>
            ) : (
              renderStartBlock()
            )}

            {/* Subtle profile persistence indicator */}
            {showSavedToast && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full animate-in fade-in duration-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Сохранено</span>
              </span>
            )}
          </div>

          {/* Right: Quick Simulation Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Unified Start Block (Старт: Дата + Баланс) - visible on right only when sidebar is collapsed */}
            {isSidebarCollapsed && renderStartBlock()}

            {/* Period Switcher (30д, 60д, 90д, 180д) */}
            <div
              className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold"
              title="Глубина горизонта планирования"
            >
              {[30, 60, 90, 180].map((days) => (
                <button
                  key={days}
                  onClick={() => updateProfileField('period', days as any)}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-md transition cursor-pointer ${
                    period === days
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {days}д
                </button>
              ))}
            </div>

            {/* Toggle Metric Cards on Dashboard */}
            {activeTab === 'dashboard' && (
              <button
                onClick={toggleMetricCards}
                className={`hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  showMetricCards
                    ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
                title={showMetricCards ? 'Свернуть карточки метрик для экономии места' : 'Показать карточки метрик'}
              >
                {showMetricCards ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span className="hidden xl:inline">{showMetricCards ? 'Скрыть KPI' : 'Показать KPI'}</span>
              </button>
            )}

            {/* User Profile Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition cursor-pointer shadow-2xs group"
              title="Настройки профиля и параметров моделирования"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                {profile.fullName?.charAt(0) || 'П'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="font-semibold text-slate-800 leading-tight group-hover:text-blue-600 truncate max-w-[90px]">
                  {profile.fullName.split(' ')[0]}
                </span>
                <span className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[90px]">
                  {profile.email.split('@')[0]}
                </span>
              </div>
              <Settings size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
            </button>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <main
          ref={mainScrollRef}
          className={`relative flex-1 ${
            activeTab === 'calendar' || (activeTab === 'dashboard' && !isRulesCollapsed)
              ? 'overflow-hidden flex flex-col p-2.5 sm:p-3.5 lg:p-4 min-h-0 gap-3'
              : 'overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5'
          }`}
        >
          {/* TAB 1: CASH FLOW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {/* Cash Gap Alert Banner if detected */}
              {summary.hasCashGap && (
                <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600 shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm">
                        Внимание! Обнаружен прогнозный кассовый разрыв
                      </h4>
                      <p className="text-[11px] sm:text-xs text-rose-700 mt-0.5">
                        Через {summary.daysUntilGap} дней ({summary.firstGapDate}) баланс упадет ниже 0 ₽.
                        Пиковый дефицит:{' '}
                        <strong className="font-mono">{summary.maxDeficit.toLocaleString('ru-RU')} ₽</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('gaps')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    План ликвидации разрыва →
                  </button>
                </div>
              )}

              {/* 3 Compact Fintech KPI Cards (Optimized without duplicate start balance) */}
              {showMetricCards && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
                  {/* 1. Минимальный баланс */}
                  <div className="bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between relative overflow-hidden group">
                    <div
                      className={`absolute top-0 left-0 right-0 h-0.5 ${
                        summary.minBalance < 0
                          ? 'bg-rose-500'
                          : summary.minBalance < profile.safetyBuffer
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    ></div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span
                        className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${
                          summary.minBalance < 0
                            ? 'text-rose-600'
                            : summary.minBalance < profile.safetyBuffer
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        Минимальный баланс
                      </span>
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          summary.minBalance < 0
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <AlertTriangle size={13} />
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span
                        className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight ${
                          summary.minBalance < 0 ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {summary.minBalance.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      Дата минимума: {summary.minBalanceDate || '—'}
                    </div>
                  </div>

                  {/* 2. Дней до разрыва */}
                  <div className="bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between relative overflow-hidden group">
                    <div
                      className={`absolute top-0 left-0 right-0 h-0.5 ${
                        summary.hasCashGap ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    ></div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span
                        className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${
                          summary.hasCashGap ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {summary.hasCashGap ? 'Кассовый разрыв' : 'Статус баланса'}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          summary.hasCashGap ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <Calendar size={13} />
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-slate-800">
                        {summary.hasCashGap ? `${summary.daysUntilGap} дней` : 'Безопасно ✅'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {summary.hasCashGap ? `Длительность: ${summary.gapDurationDays} дн.` : `Горизонт: ${period} дней`}
                    </div>
                  </div>

                  {/* 3. Чистый Cash Flow */}
                  <div className="bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between relative overflow-hidden group">
                    <div
                      className={`absolute top-0 left-0 right-0 h-0.5 ${
                        summary.netCashFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    ></div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span
                        className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${
                          summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        Чистый Cash Flow
                      </span>
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CreditCard size={13} />
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span
                        className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight ${
                          summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {summary.netCashFlow >= 0 ? '+' : ''}
                        {summary.netCashFlow.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      Доход: +{(summary.totalIncome / 1000).toFixed(0)}k | Расход: -{(summary.totalExpense / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>
              )}

              {/* Chart Card */}
              <div
                ref={chartCardRef}
                className={`transition-all duration-200 shrink-0 relative z-30 overflow-visible ${
                  isChartCompact
                    ? 'bg-white rounded-xl shadow-xs border border-slate-200 px-3.5 py-2'
                    : 'bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5'
                }`}
              >
                {/* Header: Compact view vs Full view */}
                {isChartCompact ? (
                  <div className="flex items-center justify-between gap-3 mb-1 text-xs border-b border-slate-100 pb-1.5 select-none">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <TrendingUp size={14} className="text-blue-600 shrink-0" />
                        <span>Динамика баланса</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 truncate">
                        <span className="text-slate-300">|</span>
                        <span>
                          Мин:{' '}
                          <strong className={summary.minBalance < 0 ? 'text-rose-600' : 'text-slate-800'}>
                            {summary.minBalance.toLocaleString('ru-RU')} ₽
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => updateProfileField('showCompactTooltip', !(profile.showCompactTooltip === true))}
                        className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                        title="Подсказки при наведении на компактный график"
                      >
                        {profile.showCompactTooltip ? 'Скрыть подсказки' : 'Подсказки'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        Динамика баланса
                      </h3>
                      <span className="text-xs text-slate-400">· Горизонт: {period} дней</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Доход</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                          <span>Расход</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                          <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span>
                          <span>0 ₽</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <ForecastChart
                  points={points}
                  activeHoverPoint={hoveredPoint}
                  activeDate={hoveredPoint?.date}
                  onHoverPointChange={(pt) => setHoveredPoint(pt)}
                  onSelectPoint={(pt) => setDaySlicePoint(pt)}
                  contextPoint={contextMenu.visible ? contextMenu.point : null}
                  onContextMenu={handleChartContextMenu}
                  hoveredRuleId={hoveredRuleId}
                  safetyBuffer={profile.safetyBuffer}
                  isCompact={isChartCompact}
                  customHeight={isChartCompact ? undefined : dashboardChartHeight}
                  showCompactTooltip={profile.showCompactTooltip ?? false}
                />
              </div>

              {/* Rules Manager on Dashboard */}
              <div
                ref={rulesSectionRef}
                id="rules-section"
                className={`scroll-mt-52 ${!isRulesCollapsed ? 'flex-1 flex flex-col min-h-0' : 'shrink-0'}`}
              >
                <RulesManager
                  rules={rules}
                  onAddRule={handleAddRule}
                  onUpdateRule={handleUpdateRule}
                  onDeleteRule={handleDeleteRule}
                  onToggleRule={handleToggleRule}
                  activeHoverPoint={hoveredPoint}
                  isOpenModal={isRuleModalOpen}
                  onOpenModalChange={setIsRuleModalOpen}
                  prefillData={rulePrefill}
                  hoveredRuleId={hoveredRuleId}
                  onHoverRuleChange={setHoveredRuleId}
                  defaultDate={hoveredPoint ? hoveredPoint.date : startDate}
                  forecastStartDate={startDate}
                  forecastEndDate={summary.endDate}
                  isCollapsed={isRulesCollapsed}
                  onToggleCollapse={() => setIsRulesCollapsed((prev) => !prev)}
                />
              </div>
            </>
          )}

          {/* TAB 2: EXCEL-STYLE DEDICATED CALENDAR & TRANSACTIONS VIEW */}
          {activeTab === 'calendar' && (
            <div className="flex-1 flex flex-col min-h-0 gap-3">
              {/* Docked Minimalist Horizontal Radar Header */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 transition shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1 px-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800 text-xs">Динамика баланса</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-medium flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Доходы
                    </span>
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Расходы
                    </span>
                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Остаток на {selectedCalendarDate || (hoveredPoint ? hoveredPoint.date : startDate)}:{' '}
                      <strong className="text-blue-600 font-bold">
                        {((points.find((p) => p.date === (selectedCalendarDate || hoveredPoint?.date)) || points[0])?.closingBalance || 0).toLocaleString('ru-RU')} ₽
                      </strong>
                    </span>
                    <button
                      onClick={() => setIsRadarCollapsed(!isRadarCollapsed)}
                      className="p-1 px-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 text-[11px]"
                      title={isRadarCollapsed ? 'Развернуть график' : 'Свернуть график для увеличения высоты таблицы'}
                    >
                      {isRadarCollapsed ? (
                        <>
                          <ChevronDown size={14} />
                          <span className="text-[10px]">Развернуть</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp size={14} />
                          <span className="text-[10px]">Свернуть</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!isRadarCollapsed && (
                  <ForecastChart
                    points={points}
                    activeHoverPoint={hoveredPoint}
                    activeDate={hoveredPoint?.date || selectedCalendarDate}
                    onHoverPointChange={(pt) => setHoveredPoint(pt)}
                    onSelectPoint={(pt) => {
                      setSelectedCalendarDate(pt.date);
                      setHoveredPoint(pt);
                      setCalendarScrollTrigger(Date.now());
                    }}
                    safetyBuffer={profile.safetyBuffer}
                    isCompact={true}
                    showCompactTooltip={false}
                  />
                )}
              </div>

              {/* Vertical Date Unfolded Ledger Table */}
              <CalendarLedger
                points={points}
                rules={rules}
                onDeleteRule={handleDeleteRule}
                onEditRule={handleOpenEditRule}
                onAddRuleAtDate={handleOpenAddRuleAtDate}
                hoveredPoint={hoveredPoint}
                onHoverPointChange={setHoveredPoint}
                selectedDate={selectedCalendarDate}
                onSelectDate={setSelectedCalendarDate}
                safetyBuffer={profile.safetyBuffer}
                forecastStartDate={startDate}
                forecastEndDate={summary.endDate}
                scrollTrigger={calendarScrollTrigger}
              />
            </div>
          )}

          {/* TAB 3: CASH GAPS DIAGNOSTICS */}
          {activeTab === 'gaps' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  Диагностика и ликвидация кассовых разрывов
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Кассовый разрыв возникает, когда в определенный день месяца совокупные списания превышают доступный баланс.
                  Ниже приведен автоматический расчет сценариев решения на основе данных модели.
                </p>

                {summary.hasCashGap ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="font-semibold text-rose-900 text-sm mb-1">
                        Критическая точка: {summary.firstGapDate} (через {summary.daysUntilGap} дней)
                      </div>
                      <div className="text-xs text-rose-700">
                        Максимальный дефицит в пике: <strong className="font-mono text-sm">{summary.maxDeficit.toLocaleString('ru-RU')} ₽</strong>.
                        Суммарно дней в дефиците за период: {summary.gapDurationDays} дней.
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm mt-4">
                      Рекомендуемые меры предотвращения (Action Plan):
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="font-bold text-blue-700 text-sm mb-1">
                          1. Сдвиг даты обязательства
                        </div>
                        <p className="text-slate-600">
                          Перенести платеж по аренде или крупную разовую покупку на дату после поступления зарплаты (например, на 11 или 26 число).
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="font-bold text-emerald-700 text-sm mb-1">
                          2. Подушка ликвидности
                        </div>
                        <p className="text-slate-600">
                          Пополнить текущий счет минимум на{' '}
                          <strong className="font-mono font-bold text-emerald-700">
                            {(summary.maxDeficit + 5000).toLocaleString('ru-RU')} ₽
                          </strong>{' '}
                          до {summary.firstGapDate}.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="font-bold text-purple-700 text-sm mb-1">
                          3. Рассрочка или сплит
                        </div>
                        <p className="text-slate-600">
                          Разбить разовый расход на 2–4 части с фиксированным сроком окончания (`end_date`), распределив нагрузку по месяцам.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shrink-0">
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base">Кассовых разрывов не обнаружено!</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        На всем горизонте моделирования ({period} дней) минимальный остаток не опускается ниже{' '}
                        <strong className="font-mono font-bold">{summary.minBalance.toLocaleString('ru-RU')} ₽</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ARCHITECTURE & THESIS */}
          {activeTab === 'architecture' && <ArchitectureView />}
        </main>

        {/* Global Rule Modal (Shared by Calendar Ledger) */}
        <RuleModal
          isOpen={calendarModalState.isOpen}
          onClose={() => setCalendarModalState((prev) => ({ ...prev, isOpen: false, editingRule: null, prefillData: null }))}
          onSaveRule={handleSaveRuleFromModal}
          editingRule={calendarModalState.editingRule}
          prefillData={calendarModalState.prefillData}
          defaultDate={selectedCalendarDate || startDate}
          forecastStartDate={startDate}
          forecastEndDate={summary.endDate}
        />

        {/* Floating Context Menu (Right Click on Forecast Chart) */}
        {contextMenu.visible && contextMenu.point && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            point={contextMenu.point}
            onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
            onAddRule={(pt, flowType) => handleContextMenuAddRule(pt, flowType)}
            onViewDaySlice={(pt) => handleContextMenuViewDaySlice(pt)}
          />
        )}

        {/* Day Slice Modal Inspection */}
        {daySlicePoint && (
          <DaySliceModal
            point={daySlicePoint}
            onClose={() => setDaySlicePoint(null)}
            onAddTransaction={(pt) => handleContextMenuAddRule(pt)}
          />
        )}

        {/* User Profile Settings Modal */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={profile}
          onSaveProfile={handleSaveProfile}
          onResetToDefaults={handleResetToDefaults}
        />
      </div>
    </div>
  );
}
