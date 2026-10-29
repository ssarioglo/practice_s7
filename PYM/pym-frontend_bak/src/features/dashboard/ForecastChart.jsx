import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { financeApi } from '../../services/api';

export default function ForecastChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    financeApi.getForecast()
      .then(data => {
        setChartData(data.points || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Не удалось загрузить прогноз ликвидности');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>;
  if (error) return <div className="alert alert-danger m-3">{error}</div>;

  return (
    <div className="card bg-dark border-secondary p-4 shadow-sm">
      <h5 className="card-title text-light mb-4">📈 Прогноз ликвидности PYM (90 дней)</h5>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c3036" />
            <XAxis dataKey="date" stroke="#6c757d" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6c757d" style={{ fontSize: '12px' }} domain={['dataMin - 10000', 'dataMax + 10000']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#212529', borderColor: '#495057', color: '#fff' }}
              itemStyle={{ color: '#0d6efd' }}
            />
            <Line 
              type="stepAfter" // Формирует финансовые ступеньки
              dataKey="balance" 
              stroke="#0d6efd" // Фирменный синий цвет Bootstrap
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
