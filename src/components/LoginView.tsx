import React, { useState } from 'react';
import { backendApi } from '../services/api.ts';

interface StoredUser {
  login: string;
  password: string;
  fullName: string;
}

const USERS_DB_KEY = 'pym_users_table_v1';

const DEFAULT_USERS: StoredUser[] = [
  {
    login: 'admin',
    password: 'admin123',
    fullName: 'Администратор (Фин. отдел)',
  },
  {
    login: 'sarioglo',
    password: '123456',
    fullName: 'Сариогло С.Д.',
  },
];

function getUsersFromStorage(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // пусто
  }
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

interface LoginViewProps {
  onLoginSuccess: (login: string, fullName: string, isBackendConnected: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanLogin = login.trim();
    if (!cleanLogin || !password) {
      setError('Заполните логин и пароль.');
      return;
    }

    if (mode === 'register') {
      if (cleanLogin.length < 3) {
        setError('Логин должен содержать минимум 3 символа.');
        return;
      }
      if (password.length < 4) {
        setError('Пароль должен содержать минимум 4 символа.');
        return;
      }
    }

    setLoading(true);
    try {
      // пробуем войти через бэк (шлюз + бд)
      if (mode === 'login') {
        const res = await backendApi.auth.login(cleanLogin, password);
        onLoginSuccess(res.login, res.fullName, true);
        return;
      } else {
        const res = await backendApi.auth.register(
          cleanLogin,
          password,
          fullName.trim() || cleanLogin
        );
        onLoginSuccess(res.login, res.fullName, true);
        return;
      }
    } catch (err: any) {
      // если бэк вернул ошибку пароля то выводим ее
      if (err && typeof err.status === 'number') {
        setError(err.message || 'Ошибка проверки учетных данных в СУБД.');
        setLoading(false);
        return;
      }
      // иначе если докер не запущен проверяем по локалстораджу
    }

    try {
      const users = getUsersFromStorage();
      if (mode === 'login') {
        const found = users.find(
          (u) => u.login.toLowerCase() === cleanLogin.toLowerCase() && u.password === password
        );
        if (!found) {
          setError('Ошибка авторизации: неверный логин или пароль.');
          return;
        }
        onLoginSuccess(found.login, found.fullName, false);
      } else {
        const exists = users.some((u) => u.login.toLowerCase() === cleanLogin.toLowerCase());
        if (exists) {
          setError('Пользователь с таким логином уже зарегистрирован в БД.');
          return;
        }
        const newUser: StoredUser = {
          login: cleanLogin,
          password,
          fullName: fullName.trim() || cleanLogin,
        };
        const updated = [...users, newUser];
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(updated));
        setInfo('Учетная запись создана. Теперь вы можете войти.');
        setMode('login');
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e9ecef] flex flex-col justify-center items-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-sm bg-white border border-gray-400 shadow-xs">
        <div className="px-4 py-3 bg-[#337ab7] text-white border-b border-gray-400">
          <div className="font-bold text-sm">
            PYM — Система планирования ДДС и ликвидности
          </div>
          <div className="text-xs text-blue-100">
            Авторизация пользователя
          </div>
        </div>

        <div className="flex border-b border-gray-300 bg-gray-100 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 font-bold border-r border-gray-300 cursor-pointer ${
              mode === 'login' ? 'bg-white text-gray-900' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Вход в систему
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-2 font-bold cursor-pointer ${
              mode === 'register' ? 'bg-white text-gray-900' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && (
            <div className="p-2 bg-[#f2dede] border border-[#ebccd1] text-[#a94442]">
              {error}
            </div>
          )}

          {info && (
            <div className="p-2 bg-[#dff0d8] border border-[#d6e9c6] text-[#3c763d]">
              {info}
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Логин пользователя:
            </label>
            <input
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите логин"
              className="w-full px-2.5 py-1.5 bg-white border border-gray-400 text-sm focus:outline-none focus:border-[#337ab7]"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                ФИО / Подразделение:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов И.И. (Бухгалтерия)"
                className="w-full px-2.5 py-1.5 bg-white border border-gray-400 text-sm focus:outline-none focus:border-[#337ab7]"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Пароль:
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full px-2.5 py-1.5 bg-white border border-gray-400 text-sm focus:outline-none focus:border-[#337ab7]"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[#337ab7] hover:bg-[#286090] border border-[#204d74] text-white font-bold text-xs cursor-pointer disabled:opacity-60"
            >
              {loading
                ? 'Проверка учетных данных...'
                : mode === 'login'
                ? 'Войти'
                : 'Зарегистрировать пользователя'}
            </button>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-300 bg-gray-50 p-2 text-[11px] text-gray-600">
            <div className="font-bold text-gray-700 mb-0.5">Тестовые учетные записи БД:</div>
            <div>
              • Логин: <code className="font-mono font-bold">sarioglo</code> / Пароль:{' '}
              <code className="font-mono font-bold">123456</code>
            </div>
            <div>
              • Логин: <code className="font-mono font-bold">admin</code> / Пароль:{' '}
              <code className="font-mono font-bold">admin123</code>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
