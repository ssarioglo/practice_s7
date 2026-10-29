import React, { useState } from 'react';
import DashboardPage from './features/dashboard/DashboardPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container-fluid min-vh-100" style={{ backgroundColor: '#0d0e12' }}>
      <div className="row min-vh-100">
        
        {/* Боковая панель (Sidebar) */}
        <nav className="col-md-3 col-lg-2 bg-dark p-3 border-end border-secondary d-flex flex-column">
          <h4 className="text-primary fw-bold mb-4 text-center mt-2">PYM v1.0</h4>
          <ul className="nav flex-column gap-2">
            <li className="nav-item">
              <button 
                className={`nav-link w-100 text-start btn ${activeTab === 'dashboard' ? 'btn-primary text-white' : 'text-light'}`}
                style={activeTab !== 'dashboard' ? { backgroundColor: '#1e2125' } : {}}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Дашборд
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link w-100 text-start btn ${activeTab === 'rules' ? 'btn-primary text-white' : 'text-light'}`}
                style={activeTab !== 'rules' ? { backgroundColor: '#1e2125' } : {}}
                onClick={() => setActiveTab('rules')}
              >
                📝 База правил
              </button>
            </li>
          </ul>
          <div className="mt-auto text-center text-secondary small pb-2">ВКР Прототип</div>
        </nav>

        {/* Основной контентный блок */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-3" style={{ backgroundColor: '#0d0e12' }}>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'rules' && (
            <div className="text-white p-4">
              <h2 className="text-light mb-4">Управление правилами</h2>
              <p className="text-secondary">Здесь будет располагаться форма ввода твоих 3 типов расходов.</p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
