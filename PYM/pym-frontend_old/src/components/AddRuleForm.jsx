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
      setMessage({ text: 'Финансовое правило успешно зафиксировано!', type: 'success' });
      setName('');
      setAmount('');
      onRuleAdded(); 
    } catch (err) {
      setMessage({ text: err.message || 'Не удалось сохранить правило', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3">
        <h6 className="m-0 font-weight-bold text-primary fw-bold">⚙️ Конфигуратор правил ликвидности</h6>
      </div>
      <div className="card-body p-4">
        {message.text && (
          <div className={`alert alert-${message.type} py-2 small fw-bold text-center border-0 mb-3`} style={{ borderRadius: '0.35rem' }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small text-uppercase text-muted fw-bold">Название финансовой операции</label>
            <input 
              type="text" 
              className="form-control form-control-lg text-white font-weight-bold fs-6" 
              placeholder="Например: Яндекс Сплит, Выплата зарплаты..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label small text-uppercase text-muted fw-bold">Сумма транзакции (₽)</label>
              <input 
                type="number" 
                min="0.01" 
                step="0.01" 
                className="form-control text-white fw-bold" 
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-uppercase text-muted fw-bold">Направление денежного потока</label>
              <select className="form-select text-white fw-bold" value={flowType} onChange={(e) => setFlowType(e.target.value)}>
                <option value="EXPENSE" className="text-danger">🛑 Расход (Списание -)</option>
                <option value="INCOME" className="text-success">🟢 Доход (Поступление +)</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label small text-uppercase text-muted fw-bold">Периодичность операции</label>
              <select className="form-select text-white" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
                <option value="ONCE">Разовый платеж</option>
                <option value="RECURRING">Циклический (Повторяемый)</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small text-uppercase text-muted fw-bold">Категория обязательства</label>
              <select className="form-select text-white" value={categoryType} onChange={(e) => setCategoryType(e.target.value)}>
                <option value="COMMON">Обычные текущие траты</option>
                <option value="CREDIT">Кредиты, Рассрочки, Грейс-периоды</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label small text-uppercase text-muted fw-bold">Дата активации правила</label>
              <input type="date" className="form-control text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-uppercase text-muted fw-bold">Дата окончания (Опционально)</label>
              <input type="date" className="form-control text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {ruleType === 'RECURRING' && (
            <div className="mb-4 p-3 rounded" style={{ backgroundColor: '#12141a', border: '1px stroke #282b36' }}>
              <label className="form-label small text-uppercase text-primary fw-bold">Число расчетного месяца для списания (1-31)</label>
              <input 
                type="number" 
                min="1" 
                max="31" 
                className="form-control text-white font-weight-bold" 
                value={dayOfMonth} 
                onChange={(e) => setDayOfMonth(e.target.value)} 
                required 
              />
              <div className="form-text text-muted small mt-1">Транзакция будет автоматически генерироваться движком Cash Flow каждого указанного числа.</div>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-100 fw-bold py-2 btn-block text-uppercase shadow-sm mt-2" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Синхронизация с базой...
              </>
            ) : 'Зафиксировать правило в PostgreSQL'}
          </button>
        </form>
      </div>
    </div>
  );
};
