const BASE_URL = 'http://localhost:9800/api/v1'; // адрес шлюза

// Функция для записи куки с фронтенда
export const setClientCookie = (name, value, days = null) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = `;expires=${date.toUTCString()}`;
  }
  // Записываем обычную куку. Без флага HttpOnly.
  document.cookie = `${name}=${encodeURIComponent(value)}${expires};path=/;SameSite=Lax`;
};

// Функция для чтения куки на фронтенде
export const getClientCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

// Опции по умолчанию для ВСЕХ запросов
const fetchOptions = (method, body = null) => {
  const options = {
    method,
    // Заставляет браузер отправлять и принимать Куки кросс-доменно
    credentials: 'include',
    headers: {}
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  return options;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    // Генерируем глобальное событие падения сессии, чтобы App.jsx переключил экран на логин
    window.dispatchEvent(new Event('auth-failed'));
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
  }
  return response.json();
};

export const api = {
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${BASE_URL}/auth/login`, fetchOptions('POST', { email, password }));
      return handleResponse(res);
    },
    register: async (email, password) => {
      const res = await fetch(`${BASE_URL}/auth/register`, fetchOptions('POST', { email, password }));
      return handleResponse(res);
    }
  },

  forecast: {
    get: async (initialBalance, startDate, periodDays = 90) => {
      const query = new URLSearchParams({ initialBalance, startDate, periodDays }).toString();
      const res = await fetch(`${BASE_URL}/forecast?${query}`, fetchOptions('GET'));
      return handleResponse(res);
    }
  },

    rules: {
    // 1. Создание правила
    create: async (ruleData) => {
      const res = await fetch(`${BASE_URL}/rules`, fetchOptions('POST', ruleData));
      return handleResponse(res);
    },
    // 2. Получение ВСЕХ правил пользователя (Для вывода таблицы)
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/rules`, fetchOptions('GET'));
      return handleResponse(res);
    },
    // 3. Получение ОДНОГО конкретного правила по ID (Например, для открытия в модальном окне редактирования)
    getOne: async (id) => {
      const res = await fetch(`${BASE_URL}/rules?id=${id}`, fetchOptions('GET'));
      return handleResponse(res);
    },
    // 4. Обновление правила по ID (PUT)
    update: async (id, updatedData) => {
      const res = await fetch(`${BASE_URL}/rules?id=${id}`, fetchOptions('PUT', updatedData));
      return handleResponse(res);
    },
    // 5. Удаление правила по ID (DELETE)
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/rules?id=${id}`, fetchOptions('DELETE'));
      return handleResponse(res);
    }
  }

};
