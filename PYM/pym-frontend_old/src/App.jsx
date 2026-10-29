import React, { useState, useEffect, useCallback } from 'react';
import { AuthPage } from './components/AuthPage';
import { ForecastChart } from './components/ForecastChart';
import { AddRuleForm } from './components/AddRuleForm';
import { api, getClientCookie, setClientCookie } from './services/api';

function App() {
  // РЕШЕНИЕ БЭКЕНД-ЧАТА: по умолчанию считаем пользователя авторизованным, 
  // чтобы React сразу попытался дернуть график и отправить куку в шлюз
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');  
  const [forecastData, setForecastData] = useState([]);
  const [metrics, setMetrics] = useState({ minBalance: 0, finalBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // При инициализации React смотрит в куки.
  const [initialBalance, setInitialBalance] = useState(() => {
    return getClientCookie('pym_initial_balance') || '150000';
  });
  const [startDate, setStartDate] = useState(() => {
    return getClientCookie('pym_start_date') || '2026-05-24';
  });
  const [periodDays, setPeriodDays] = useState(() => {
    return getClientCookie('pym_period_days') || '90';
  });

  // Обработчик изменения баланса пользователем в инпуте
  const handleBalanceChange = (e) => {
    const value = e.target.value;
    setInitialBalance(value);
    setClientCookie('pym_initial_balance', value, 7);
  };

  // Обработчик изменения даты прогноза
  const handleDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);
    setClientCookie('pym_start_date', value, 7);
  };

  // Обработчик изменения глубины прогноза (например, выпадающий список: 30, 60, 90, 180 дней)
  const handlePeriodChange = (e) => {
    const value = e.target.value;
    setPeriodDays(value);
    setClientCookie('pym_period_days', value, 30); // Запоминаем в куки на 30 дней
  };

  // Функция загрузки прогноза
  const fetchForecast = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const resData = await api.forecast.get(initialBalance, startDate, periodDays);
      
      // Безопасная распаковка массива из ответа бэкенда
      let targetArray = [];
      if (Array.isArray(resData)) {
        targetArray = resData;
      } else if (resData && typeof resData === 'object') {
        const foundArray = Object.values(resData).find(val => Array.isArray(val));
        if (foundArray) targetArray = foundArray;
      }

      // setForecastData(resData || []); // было
      setForecastData(resData || targetArray); // по рекоммендации Glaude
      
      // Расчет быстрых метрик
      if (targetArray && targetArray.length > 0) {
        const balances = targetArray.map(d => d.balance || 0);
        setMetrics({
          minBalance: Math.min(...balances),
          finalBalance: balances[targetArray.length - 1]
        });
      } else {
        setMetrics({ minBalance: 0, finalBalance: 0 });
      }
    } catch (err) {
      // Ошибку 401 обрабатывать здесь не нужно, её перехватит глобальный слушатель ниже
      if (err.message !== 'Unauthorized') {
        setError(err.message || 'Не удалось загрузить финансовый прогноз');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, initialBalance, startDate, periodDays]);

  // Запуск загрузки при старте приложения (F5) или изменении инпутов
  useEffect(() => {
    if (isAuthenticated) { 
      fetchForecast(); 
    }
  }, [fetchForecast, isAuthenticated]);

  // Глобальный перехватчик 401 ошибки. Если шлюз забракует куку, 
  // событие 'auth-failed' мягко переключит стейт на экран логина
  useEffect(() => {
    const handleAuthFailed = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, []);

  // Если шлюз вернул 401 — показываем форму авторизации
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div id="wrapper" className="d-flex w-100" style={{ minHeight: '100vh' }}>
      {/* Боковая панель в стиле SB Admin 2 */}
      <ul className="navbar-nav sidebar-light-theme sidebar sidebar-dark accordion p-3" style={{ width: '240px', listStyle: 'none', minHeight: '100vh', margin: 0 }}>
        <div className="sidebar-brand d-flex align-items-center justify-content-center mb-4">
          <div className="sidebar-brand-text mx-3 h4 mb-0 fw-bold text-white">PYM v1.0</div>
        </div>
        
        <hr className="sidebar-divider my-0 border-white" style={{ opacity: 0.3 }} />
        
        <li className="nav-item mt-3">
          <button 
            className={`nav-link-custom w-100 text-start btn border-0 py-2 px-3 rounded fw-bold ${activeTab === 'dashboard' ? 'active-item' : ''}`} 
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Дашборд
          </button>
        </li>

        <li className="nav-item mt-2">
          <button 
            className={`nav-link-custom w-100 text-start btn border-0 py-2 px-3 rounded fw-bold ${activeTab === 'rules' ? 'active-item' : ''}`} 
            onClick={() => setActiveTab('rules')}
          >
            ⚙️ Управление
          </button>
        </li>

        <div className="mt-auto pt-4">
          <button className="btn btn-sm btn-outline-light w-100 fw-bold" onClick={() => setIsAuthenticated(false)}>Выйти</button>
        </div>
      </ul>

      {/* Основной контент */}
      <div id="content-wrapper" className="d-flex flex-column flex-grow-1">
        <div id="content" className="p-4">
          
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="h3 mb-0 text-gray-800 fw-bold">
              {activeTab === 'dashboard' ? 'Аналитика краткосрочной ликвидности' : 'Конфигуратор правил'}
            </h1>
            {loading && <div className="spinner-border spinner-border-sm text-primary" role="status"></div>}
          </div>

          {error && <div className="alert alert-danger py-2 small border-0 shadow-sm mb-4" style={{ borderRadius: '0.35rem' }}>⚠️ {error}</div>}

          {activeTab === 'dashboard' && (
            <div>
              {/* Метрики */}
              <div className="row g-3 mb-4">
                <div className="col-xl-3 col-md-6">
                  <div className="card h-100 p-2" style={{ borderLeft: '4px solid #4e73df !important' }}>
                    <div className="card-body py-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1 small fw-bold">Текущий баланс (₽)</div>
                      <input 
                        type="number" 
                        className="form-control form-control-sm fw-bold fs-5 mt-1 text-dark" 
                        value={initialBalance} 
                        onChange={handleBalanceChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6">
                  <div className="card h-100 p-2" style={{ borderLeft: '4px solid #1cc88a !important' }}>
                    <div className="card-body py-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1 small fw-bold">Стартовая дата</div>
                      <input 
                        type="date" 
                        className="form-control form-control-sm mt-1 text-dark fw-bold" 
                        value={startDate} 
                        onChange={handleDateChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Глубина временного прогноза */}
                <div className="col-xl-3 col-md-6">
                  <div className="card h-100 p-2" style={{ borderLeft: '4px solid #f6c23e !important' }}>
                    <div className="card-body py-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1 small fw-bold">Глубина анализа</div>
                      <select 
                        className="form-select form-select-sm mt-1 text-dark fw-bold" 
                        value={periodDays} 
                        onChange={handlePeriodChange}
                      >
                        <option value="30">30 дней (Краткосрочно)</option>
                        <option value="60">60 дней (Среднесрочно)</option>
                        <option value="90">90 дней (Квартал)</option>
                        <option value="180">180 дней (Полугодие)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-md-6">
                  <div className="card h-100 p-2" style={{ borderLeft: `4px solid ${metrics.minBalance < 0 ? '#e74a3b' : '#1cc88a'} !important` }}>
                    <div className="card-body py-2">
                      <div className={`text-xs font-weight-bold text-uppercase mb-1 small fw-bold ${metrics.minBalance < 0 ? 'text-danger' : 'text-success'}`}>
                        Минимум на периоде
                      </div>
                      <div className={`h4 mb-0 font-weight-bold mt-2 fw-bold ${metrics.minBalance < 0 ? 'text-danger' : 'text-success'}`}>
                        {metrics.minBalance.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* График */}
              <div className="card shadow mb-4">
                <div className="card-header py-3 bg-light d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary fw-bold">📈 Прогноз Cash Flow (нативный SVG, глубина: {periodDays} дней)</h6>
                </div>
                <div className="card-body bg-white" style={{ minHeight: '360px' }}>
                  <ForecastChart data={forecastData} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="row">
              <div className="col-lg-7 col-md-12">
                <AddRuleForm onRuleAdded={fetchForecast} />
              </div>
              <div className="col-lg-5 col-md-12 mt-3 mt-lg-0">
                <div className="card p-4 text-center h-100 d-flex align-items-center justify-content-center text-secondary">
                  <div className="p-3">
                    <h5 className="text-gray-800 fw-bold mb-2">💡 Как это работает?</h5>
                    <p className="mb-0 small text-muted">Все созданные правила мгновенно пересчитываются аналитическим ядром на бэкенде Go и Python. График Cash Flow перестроится автоматически при переключении на Дашборд.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

}

export default App;
