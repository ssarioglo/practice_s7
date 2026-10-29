import React from 'react';
import ForecastChart from './ForecastChart';

export default function DashboardPage() {
  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom border-secondary">
        <h1 className="h2 text-white">Рабочее пространство</h1>
      </div>

      {/* Верхние информационные карточки */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card bg-dark border-secondary text-white p-3 shadow-sm">
            <small className="text-secondary">Текущий дебет (Кэш)</small>
            <h3 className="text-success mt-1">150 000 ₽</h3>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card bg-dark border-secondary text-white p-3 shadow-sm">
            <small className="text-secondary">Ближайшее обязательство (16 июня)</small>
            <h3 className="text-danger mt-1">-5 500 ₽</h3>
          </div>
        </div>
      </div>

      {/* Основной график */}
      <div className="row">
        <div className="col-12">
          <ForecastChart />
        </div>
      </div>
    </div>
  );
}
