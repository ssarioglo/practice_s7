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
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: '#0d0e12' }}>
      <div className="card p-4 text-light border-secondary" style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e2125' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">PYM</h2>
          <p className="text-muted small">Plan Your Money — Ликвидность на 90 дней</p>
        </div>

        <h4 className="mb-3 text-center text-white">{isLogin ? 'Войти в систему' : 'Регистрация аккаунта'}</h4>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small text-muted">Email адрес</label>
            <input
              type="email"
              className="form-control bg-dark text-light border-secondary"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label small text-muted">Пароль</label>
            <input
              type="password"
              className="form-control bg-dark text-light border-secondary"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-100 mt-2 fw-bold" disabled={loading}>
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none small text-primary"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Еще нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};
