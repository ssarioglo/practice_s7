// Базовый URL нашего Go-сервиса, который запущен локально
const BASE_URL = 'http://localhost:9800/api/v1'; 

export const financeApi = {
  /**
   * Получить массив точек для прогнозного графика
   * @returns {Promise<{points: Array<{date: string, balance: number}>}>}
   */
  getForecast: async () => {
    try {
      const response = await fetch(`${BASE_URL}/forecast`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении прогноза:', error);
      throw error;
    }
  },

  /**
   * Отправить новое финансовое правило в БД через Go (на будущее)
   */
  addRule: async (ruleData) => {
    try {
      const response = await fetch(`${BASE_URL}/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) {
        throw new Error(`Ошибка при сохранении: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при добавлении правила:', error);
      throw error;
    }
  }
};
