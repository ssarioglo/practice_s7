import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// 1. Сначала подключаем базовый Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// 2. Затем подключаем нашу кастомную тему (она перебьет стандартные цвета)
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
