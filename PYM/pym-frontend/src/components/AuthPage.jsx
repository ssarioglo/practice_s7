import React, { useState } from 'react';
import { api } from '../services/api';

export const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await api.auth.login(email, password);
      } else {
        await api.auth.register(email, password);
      }
      // Если шлюз ответил успехом, кука уже в браузере
      onAuthSuccess(); 
    } catch (err) {
      setError(err.message || 'Произошла ошибка при аутентификации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 position-relative" style={{ backgroundColor: '#0B1020', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      
      {/* Футуристичные фоновые световые сферы (Cinematic Glow Background) */}
      <div className="position-absolute rounded-circle" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0) 70%)', top: '-10%', left: '-10%' }}></div>
      <div className="position-absolute rounded-circle" style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, rgba(0,0,0,0) 70%)', bottom: '-20%', right: '-10%' }}></div>

      {/* Центральный блок авторизации (Glassmorphism Card) */}
      <div className="card p-4 text-slate-100 border shadow-2xl position-relative" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'rgba(15, 23, 42, 0.65)', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px', backdropFilter: 'blur(16px)' }}>
        
        <div className="text-center mb-4">
          {/* Мини-логотип с неоновым градиентом */}
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle fw-black text-white mb-2 shadow" style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3B82F6, #22D3EE)', fontSize: '18px', letterSpacing: '-1px', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>
            P
          </div>
          <h2 className="fw-bold text-white tracking-tight m-0 mt-2" style={{ fontSize: '22px' }}>PYM</h2>
          <p className="text-slate-400 small mt-1 opacity-70">Ликвидный радар Cash Flow прогнозирования</p>
        </div>

        <h5 className="mb-4 text-center fw-semibold text-slate-200" style={{ letterSpacing: '-0.3px' }}>
          {isLogin ? 'Вход в терминал' : 'Создать мастер-аккаунт'}
        </h5>

        {error && (
          <div className="alert py-2 small border-0 text-center fw-medium text-white mb-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderLeft: '3px solid #EF4444', borderRadius: '4px' }}>
            🛑 {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Электронная почта</label>
            <input
              type="email"
              className="form-control text-white border px-3 py-2"
              style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="form-label text-uppercase text-slate-400 font-medium tracking-wider" style={{ fontSize: '9px' }}>Секретный пароль</label>
            <input
              type="password"
              className="form-control text-white border px-3 py-2"
              style={{ backgroundColor: '#111827', borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', fontSize: '13px' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 fw-bold py-2 text-uppercase tracking-wider border-0 shadow-lg mt-1 transition" 
            style={{ background: 'linear-gradient(90deg, #3B82F6, #22D3EE)', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
            disabled={loading}
          >
            {loading ? 'Авторизация...' : isLogin ? 'Инициализировать вход' : 'Зарегистрировать в системе'}
          </button>
        </form>

        <div className="text-center mt-4 pt-2 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none small"
            style={{ color: '#22D3EE', fontSize: '12px', fontWeight: '500' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Новый оператор? Зарегистрироваться' : 'Уже есть доступ? Авторизоваться'}
          </button>
        </div>
      </div>
    </div>
  );
};
