import React, { useState, useEffect, useCallback } from 'react';
import { AuthPage } from './components/AuthPage';
import { ForecastChart } from './components/ForecastChart';
import { AddRuleForm } from './components/AddRuleForm';
import { api, getClientCookie, setClientCookie } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');  
  const [forecastData, setForecastData] = useState([]);
  const [rulesList, setRulesList] = useState([]); 
  const [metrics, setMetrics] = useState({ minBalance: 0, finalBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false); 
  
  // ХОВЕР-МОСТ СИНХРОНИЗАЦИИ: хранит индекс активной точки на временной шкале
  const [activeHoverIndex, setActiveHoverIndex] = useState(null);

  // Lazy-чтение сессионных кук
  const [initialBalance, setInitialBalance] = useState(() => getClientCookie('pym_initial_balance') || '150000');
  const [startDate, setStartDate] = useState(() => getClientCookie('pym_start_date') || '2026-05-24');
  const [periodDays, setPeriodDays] = useState(() => getClientCookie('pym_period_days') || '90');

  const handleBalanceChange = (e) => {
    const value = e.target.value;
    setInitialBalance(value);
    setClientCookie('pym_initial_balance', value, 7);
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);
    setClientCookie('pym_start_date', value, 7);
  };

  const handlePeriodChange = (value) => {
    setPeriodDays(value);
    setClientCookie('pym_period_days', value, 30);
  };

  // Получение правил из PostgreSQL через Go
  const fetchRulesList = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.rules.getAll();
      setRulesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка обновления ленты правил:", err);
    }
  }, [isAuthenticated]);

  // Получение аналитической матрицы прогноза
  const fetchForecast = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const resData = await api.forecast.get(initialBalance, startDate, periodDays);
      
      let targetArray = [];
      if (Array.isArray(resData)) {
        targetArray = resData;
      } else if (resData && typeof resData === 'object') {
        const foundArray = Object.values(resData).find(val => Array.isArray(val));
        if (foundArray) targetArray = foundArray;
      }

      setForecastData(resData || targetArray);
      
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
      if (err.message === 'Unauthorized') {
        setIsAuthenticated(false);
      } else {
        setError(err.message || 'Не удалось загрузить финансовый прогноз');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, initialBalance, startDate, periodDays]);

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Исключить данное финансовое обязательство из прогноза?")) return;
    try {
      await api.rules.delete(id);
      fetchForecast();
      fetchRulesList();
    } catch (err) {
      alert("Сбой удаления: " + err.message);
    }
  };

  useEffect(() => {
    if (isAuthenticated) { 
      fetchForecast(); 
      fetchRulesList();
    }
  }, [fetchForecast, fetchRulesList, isAuthenticated]);

  useEffect(() => {
    const handleAuthFailed = () => setIsAuthenticated(false);
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, []);

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

    return (
    <div className="min-vh-100 flex flex-column position-relative" style={{ backgroundColor: '#0B1020', fontSize: '13px' }}>
      
      {/* ТОРБАР (Высота 72px) */}
      <nav className="navbar navbar-expand px-4 border-bottom flex-shrink-0" style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)', borderColor: 'rgba(255, 255, 255, 0.06)', backdropFilter: 'blur(16px)', height: '72px', zIndex: 100 }}>
        <div className="container-fluid p-0 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle d-flex align-items-center justify-content-center fw-black text-white shadow-lg" style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3B82F6, #22D3EE)', fontSize: '14px', letterSpacing: '-1px' }}>P</div>
            <span className="navbar-brand fw-bold m-0 p-0 text-white tracking-tight" style={{ fontSize: '18px' }}>PYM <span className="text-secondary opacity-50 fw-normal ms-1" style={{ fontSize: '13px', color: '#94A3B8' }}>Plan Your Money</span></span>
          </div>
          
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-sm text-slate-300 font-medium border px-3" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '12px' }}>Export</button>
            <div className="text-slate-400 hover:text-white cursor-pointer transition">⚙️</div>
            <div className="rounded-circle" style={{ width: '32px', height: '32px', background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}></div>
          </div>
        </div>
      </nav>

      {/* РАБОЧАЯ СРЕДА (Сетка) */}
      <div className="flex-grow-1 d-flex flex-column gap-4 p-4" style={{ margin: '0 8px' }}>
        
        {/* KPI КАРТОЧКИ (Высота 120px, Скругление 18px) */}
        <div className="row g-3 m-0 w-100 flex-shrink-0">
          <div className="col p-0 pe-2">
            <div className="glass-card p-3 d-flex flex-column justify-content-center" style={{ height: '120px', borderRadius: '18px' }}>
              <div className="text-uppercase tracking-wider fw-bold text-slate-400" style={{ fontSize: '9px' }}>Текущий баланс</div>
              <div className="fs-3 fw-black text-white mt-1 tracking-tight">{parseFloat(initialBalance).toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
          <div className="col p-0 px-1">
            <div className="glass-card p-3 d-flex flex-column justify-content-center" style={{ height: '120px', borderRadius: '18px' }}>
              <div className="text-uppercase tracking-wider fw-bold text-slate-400" style={{ fontSize: '9px' }}>Стартовая дата</div>
              <div className="fs-4 fw-bold text-white mt-1 tracking-tight">{startDate}</div>
            </div>
          </div>
          <div className="col p-0 px-1">
            <div className="glass-card p-3 d-flex flex-column justify-content-center" style={{ height: '120px', borderRadius: '18px' }}>
              <div className="text-uppercase tracking-wider fw-bold text-slate-400" style={{ fontSize: '9px' }}>Глубина анализа</div>
              <div className="fs-3 fw-black mt-1 tracking-tight" style={{ color: '#22D3EE' }}>{periodDays} дней</div>
            </div>
          </div>
          <div className="col p-0 px-1">
            <div className="glass-card p-3 d-flex flex-column justify-content-center" style={{ height: '120px', borderRadius: '18px', borderColor: metrics.minBalance < 0 ? '#EF4444' : 'rgba(255,255,255,0.06)', boxShadow: metrics.minBalance < 0 ? 'inset 0 0 20px rgba(239, 68, 68, 0.15)' : 'none' }}>
              <div className="text-uppercase tracking-wider fw-bold text-slate-400" style={{ fontSize: '9px' }}>Минимум на периоде</div>
              <div className="fs-3 fw-black mt-1 tracking-tight" style={{ color: metrics.minBalance < 0 ? '#EF4444' : '#22C55E' }}>{metrics.minBalance.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
          <div className="col p-0 ps-2">
            <div className="glass-card p-3 d-flex flex-column justify-content-center" style={{ height: '120px', borderRadius: '18px' }}>
              <div className="text-uppercase tracking-wider fw-bold text-slate-400" style={{ fontSize: '9px' }}>Финальный баланс</div>
              <div className="fs-3 fw-black mt-1 tracking-tight" style={{ color: '#3B82F6' }}>{metrics.finalBalance.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
        </div>

        {/* ГЛАВНАЯ ОБЛАСТЬ (74% на 26%) */}
        <div className="d-flex w-100 flex-grow-1 gap-4 align-items-stretch" style={{ minHeight: '620px' }}>
          {/* ГЛАВНЫЙ ГРАФИК (74% ширины, Высота от 620px) */}
          <div className="rounded-4 p-4 d-flex flex-column justify-content-between shadow-2xl position-relative border" style={{ width: '74%', backgroundColor: '#0F172A', borderColor: 'rgba(255, 255, 255, 0.06)', minHeight: '620px' }}>
            <div className="d-flex justify-content-between align-items-center w-100 border-bottom pb-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle bg-primary" style={{ width: '6px', height: '6px', boxShadow: '0 0 10px #3B82F6' }}></div>
                <h6 className="m-0 fw-semibold text-slate-200 uppercase tracking-tight" style={{ fontSize: '13px' }}>Радар прогнозирования кассовых разрывов ({periodDays} дней)</h6>
              </div>
              {loading && <div className="spinner-border spinner-border-sm text-primary"></div>}
            </div>
            
            <div className="w-100 flex-grow-1 mt-3 position-relative" style={{ minHeight: '440px' }}>
              <ForecastChart data={forecastData} activeHoverIndex={activeHoverIndex} onHoverPointChange={(index) => setActiveHoverIndex(index)} />
            </div>

            {/* НИЖНЯЯ ПАНЕЛЬ КОНТРОЛЛЕРОВ */}
            <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center gap-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="d-flex align-items-center gap-3 flex-grow-1">
                <div className="d-flex flex-column">
                  <span className="text-uppercase text-slate-500 mb-1 fw-bold" style={{ fontSize: '9px' }}>Начальный баланс</span>
                  <input type="number" className="form-control text-white border fw-bold px-3 py-1" style={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px', width: '160px', fontSize: '13px' }} value={initialBalance} onChange={handleBalanceChange} />
                </div>
                <div className="d-flex flex-column">
                  <span className="text-uppercase text-slate-500 mb-1 fw-bold" style={{ fontSize: '9px' }}>Дата старта</span>
                  <input type="date" className="form-control text-white border px-3 py-1" style={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px', width: '160px', fontSize: '13px' }} value={startDate} onChange={handleDateChange} />
                </div>
              </div>
              
              <div className="d-flex flex-column align-items-end">
                <span className="text-uppercase text-slate-500 mb-1 fw-bold" style={{ fontSize: '9px' }}>Временной таймлайн</span>
                <div className="btn-group p-1 rounded-2" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {['30', '60', '90', '180'].map((d) => (
                    <button key={d} type="button" className="btn btn-sm border-0 px-3 py-1 fw-bold text-uppercase tracking-wider transition" style={{ fontSize: '11px', borderRadius: '4px', backgroundColor: periodDays === d ? '#3B82F6' : 'transparent', color: periodDays === d ? '#FFFFFF' : '#94A3B8', boxShadow: periodDays === d ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none' }} onClick={() => handlePeriodChange(d)}>{d}d</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* СМАРТ-ТАЙМЛАЙН ОПЕРАЦИЙ (26% ширины) */}
          <div className="p-4 d-flex flex-column rounded-4 border" style={{ width: '26%', backgroundColor: 'rgba(15, 23, 42, 0.4)', borderColor: 'rgba(255, 255, 255, 0.06)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h6 className="m-0 fw-bold tracking-tight text-white">Управление потоками</h6>
              <span className="badge text-slate-400 border px-2 py-1" style={{ fontSize: '10px', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}>{rulesList.length} правил</span>
            </div>

            <div className="flex-grow-1 overflow-auto pe-1 d-flex flex-column gap-2" style={{ maxHeight: 'calc(100vh - 270px)' }}>
              {rulesList.length === 0 ? (
                <div className="text-center text-slate-500 py-5 small opacity-60">Лента пуста.<br />Используйте FAB-клавишу.</div>
              ) : (
                rulesList.map((rule) => {
                  // ИСПРАВЛЕНО: Безопасный парсинг суммы и выбор акцентного цвета
                  const currentAmount = parseFloat(rule.amount || 0);
                  const isExpense = currentAmount < 0;
                  const isCredit = rule.category_type === 'CREDIT';
                  let accentColor = '#22C55E'; 
                  if (isExpense) accentColor = isCredit ? '#F59E0B' : '#EF4444'; 

                  // ИСПРАВЛЕНО: Четкое и точечное условие ховер-синхронизации (только для активной даты и наличия транзакции)
                  const hoveredPointData = forecastData[activeHoverIndex];
                  const isPointHovered = hoveredPointData && 
                                         hoveredPointData.date === rule.start_date && 
                                         parseFloat(hoveredPointData.amount || hoveredPointData.income_amount || hoveredPointData.expense_amount || 0) !== 0;

                  return (
                    <div 
                      key={rule.id} 
                      className="p-3 rounded-3 border d-flex justify-content-between align-items-center transition position-relative" 
                      style={{ 
                        backgroundColor: isPointHovered ? 'rgba(59, 130, 246, 0.15)' : '#111827', 
                        borderColor: isPointHovered ? '#3B82F6' : 'rgba(255, 255, 255, 0.04)', 
                        borderLeft: `3px solid ${accentColor}`,
                        transform: isPointHovered ? 'translateX(6px)' : 'none',
                        transition: 'all 150ms ease-out'
                      }}
                      onMouseEnter={() => {
                        const foundIdx = forecastData.findIndex(d => d.date === rule.start_date);
                        if (foundIdx !== -1) setActiveHoverIndex(foundIdx);
                      }}
                      onMouseLeave={() => setActiveHoverIndex(null)}
                    >
                      <div className="d-flex flex-column gap-1" style={{ maxWidth: '65%' }}>
                        {/* Адаптивный вывод НАЗВАНИЯ операции по всем возможным ключам бэкенда */}
                        <div className="fw-bold text-white small tracking-tight truncate">
                          {rule.name || rule.title || rule.operation_name || rule.description || "Без названия"}
                        </div>
                        <div className="text-slate-400 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                          <span>{rule.start_date}</span>
                          {rule.rule_type === 'RECURRING' && <span className="text-primary fw-bold" style={{ fontSize: '9px', color: '#3B82F6' }}>● ЦИКЛ</span>}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-black tracking-tight" style={{ color: accentColor, fontSize: '13px' }}>
                          {currentAmount > 0 ? `+${currentAmount.toLocaleString('ru-RU')}` : currentAmount.toLocaleString('ru-RU')} ₽
                        </span>
                        <button onClick={() => handleDeleteRule(rule.id)} className="btn p-0 text-slate-500 hover:text-danger border-0 small bg-transparent" style={{ fontSize: '11px' }}>✕</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button onClick={() => setIsModalOpen(true)} className="position-fixed border-0 d-flex align-items-center justify-content-center fw-bold transition" style={{ bottom: '32px', right: '32px', width: '54px', height: '54px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #22D3EE)', color: '#fff', fontSize: '22px', boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)', zIndex: 999 }}>+</button>

      {/* ОВЕРЛЕЙ МОДАЛЬНОГО ОКНА */}
      {isModalOpen && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(11, 16, 32, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="position-relative" style={{ width: '100%', maxWidth: '500px' }}>
            <button onClick={() => setIsModalOpen(false)} className="position-absolute btn border-0 text-slate-400 hover:text-white bg-transparent p-2" style={{ top: '15px', right: '15px', zIndex: 10 }}>✕</button>
            <AddRuleForm onRuleAdded={() => { setIsModalOpen(false); fetchForecast(); fetchRulesList(); }} />
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
