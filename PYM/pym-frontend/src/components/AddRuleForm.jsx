import React, { useState } from 'react';
import { api } from '../services/api';

export const AddRuleForm = ({ onRuleAdded }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [flowType, setFlowType] = useState('EXPENSE'); 
  const [ruleType, setRuleType] = useState('ONCE'); 
  const [categoryType, setCategoryType] = useState('COMMON'); 
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    let parsedAmount = parseFloat(amount);
    if (flowType === 'EXPENSE') {
      parsedAmount = -Math.abs(parsedAmount);
    } else {
      parsedAmount = Math.abs(parsedAmount);
    }

    const payload = {
      name,
      amount: parsedAmount,
      rule_type: ruleType,
      category_type: categoryType,
      start_date: startDate,
      end_date: endDate || null,
      day_of_month: ruleType === 'RECURRING' ? parseInt(dayOfMonth) : null
    };

    try {
      await api.rules.create(payload);
      setMessage({ text: 'Правило успешно добавлено в радар', type: 'success' });
      setName('');
      setAmount('');
      onRuleAdded(); 
    } catch (err) {
      setMessage({ text: err.message || 'Ошибка сохранения правила', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-2xl border text-slate-100" style={{ backgroundColor: '#0F172A', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}>
      <div className="card-header bg-transparent py-3 border-bottom d-flex align-items-center gap-2" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="rounded-circle" style={{ width: '6px', height: '6px', backgroundColor: '#3B82F6', boxShadow: '0 0 8px #3B82F6' }}></div>
        <h6 className="m-0 fw-bold tracking-tight text-slate-200" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Новое финансовое правило</h6>
      </div>
      
      <div className="card-body p-4">
        {message.text && (
          <div className={`alert py-2 small border-0 mb-3 text-center fw-semibold text-white`} style={{ backgroundColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderLeft: `3px solid ${message.type === 'success' ? '#22C55E' : '#EF4444'}`, borderRadius: '4px' }}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Название операции</label>
            <input 
              type="text" 
              className="form-control text-white border px-3 py-2" 
              style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
              placeholder="Контракт, Аренда офиса, Подписка..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Сумма операции (₽)</label>
              <input 
                type="number" 
                min="0.01" 
                step="0.01" 
                className="form-control text-white border px-3 py-2 fw-bold" 
                style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>
            <div className="col-md-6">
              <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Направление потока</label>
              <select 
                className="form-select text-white border px-3 py-2" 
                style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                value={flowType} 
                onChange={(e) => setFlowType(e.target.value)}
              >
                <option value="EXPENSE" style={{ backgroundColor: '#111827' }}>🛑 Списание (Расход -)</option>
                <option value="INCOME" style={{ backgroundColor: '#111827' }}>🟢 Поступление (Доход +)</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Периодичность</label>
              <select 
                className="form-select text-white border px-3 py-2" 
                style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                value={ruleType} 
                onChange={(e) => setRuleType(e.target.value)}
              >
                <option value="ONCE" style={{ backgroundColor: '#111827' }}>Разовый платеж</option>
                <option value="RECURRING" style={{ backgroundColor: '#111827' }}>Циклический цикл</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Категория ликвидности</label>
              <select 
                className="form-select text-white border px-3 py-2" 
                style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                value={categoryType} 
                onChange={(e) => setCategoryType(e.target.value)}
              >
                <option value="COMMON" style={{ backgroundColor: '#111827' }}>Текущие расходы/доходы</option>
                <option value="CREDIT" style={{ backgroundColor: '#111827' }}>Кредиты, рассрочки, Сплиты</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Дата старта</label>
              <input 
                type="date" 
                className="form-control text-white border px-3 py-2" 
                style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                required 
              />
            </div>
            <div className="col-md-6">
              <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Дата окончания (опция)</label>
              <input 
                type="date" 
                className="form-control text-white border px-3 py-2" 
                style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          {ruleType === 'RECURRING' && (
            <div className="mb-4 p-3 rounded-3 border" style={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.04)' }}>
              <label className="form-label text-uppercase text-primary font-bold tracking-wider" style={{ fontSize: '9px', color: '#3B82F6' }}>Число расчетного месяца (1-31)</label>
              <input 
                type="number" 
                min="1" 
                max="31" 
                className="form-control text-white border px-3 py-1 fw-bold" 
                style={{ backgroundColor: '#0F172A', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
                value={dayOfMonth} 
                onChange={(e) => setDayOfMonth(e.target.value)} 
                required 
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-100 fw-bold py-2 mt-2 text-uppercase tracking-wider border-0 shadow-lg" 
            style={{ background: 'linear-gradient(90deg, #3B82F6, #22D3EE)', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
            disabled={loading}
          >
            {loading ? 'Синхронизация...' : 'Внедрить в матрицу Cash Flow'}
          </button>
        </form>
      </div>
    </div>
  );
};
