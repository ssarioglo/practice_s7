import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Code2,
  HelpCircle,
  CheckCircle2,
  Terminal,
  FileText,
  Download,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'topology' | 'practice' | 'defense' | 'code'>(
    'topology'
  );
  const [selectedFile, setSelectedFile] = useState<string>('docker-compose');

  const defenseQuestions = [
    {
      q: 'Почему выбрана микросервисная архитектура, а не монолит?',
      a: 'Разделение по принципу Single Responsibility и требованиям к среде выполнения: Java Spring Cloud Gateway обеспечивает реактивную неблокирующую фильтрацию I/O на Netty и управление периметром безопасности; Go-сервис реализует Clean Architecture и высокопроизводительную работу с транзакционной базой данных (операции и справочник контрагентов); Python Predictor выступает stateless-вычислителем для векторных и матричных расчетов временных рядов.',
    },
    {
      q: 'Почему в PostgreSQL таблицы users, counterparties и finance_rules разнесены по схемам auth_schema и finance_schema без внешнего ключа (FOREIGN KEY)?',
      a: 'Это фундаментальный паттерн микросервисной архитектуры Database per Service (или Schema per Service). Наличие физического констрейнта FOREIGN KEY между сервисами создает жесткую связность (Tight Coupling) на уровне СУБД. В PYM связь поддерживается логически на уровне приложения через проверенный шлюзом X-User-Id.',
    },
    {
      q: 'Как организована защита от XSS и утечки токенов?',
      a: 'Токены JWT упаковываются в куку с флагами HttpOnly, Secure и SameSite=Lax на уровне Java Gateway. Браузерный JavaScript не имеет доступа к document.cookie для чтения токена, что полностью нейтрализует угрозу перехвата сессии через сторонние NPM-зависимости или XSS-инъекции.',
    },
    {
      q: 'Каков математический алгоритм развертывания матрицы прогноза с произвольной цикличностью?',
      a: 'Алгоритм дискретного суммирования дельт на временной шкале T = 30..180 дней. Поддерживаются разовые операции (ONCE) и циклические правила (RECURRING) с периодами: месяц (MONTH), год (YEAR), неделя (WEEK, шаг 7 дней), 2 недели (BIWEEKLY, шаг 14 дней) и произвольный интервал (CUSTOM_DAYS, шаг N дней по формуле (D_i - D_start) mod N == 0). Правила с датой окончания или проведения ранее даты Старт автоматически переводятся в статус «Архив».',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-nav tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white px-6 pt-3 rounded-t-lg shadow-xs gap-1">
        <button
          onClick={() => setActiveTab('topology')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'topology'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} /> Топология микросервисов
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'practice'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} /> Отчет по практике (Кейсы № 3–5)
        </button>
        <button
          onClick={() => setActiveTab('defense')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'defense'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle size={16} /> Архитектурные решения (Q&A)
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition cursor-pointer ${
            activeTab === 'code'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 size={16} /> Исходный код сервисов (/PYM)
        </button>
      </div>

      {activeTab === 'topology' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-5 rounded-xl border border-slate-700/80 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Terminal size={18} />
                </span>
                <h4 className="font-bold text-base text-white">
                  Развертывание контура через Docker Compose
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Проект включает 5 контейнеров: Frontend SPA, Java Gateway, Go Data-Service, Python Predictor и PostgreSQL.
                Команда запуска: <code className="bg-slate-800 px-2 py-0.5 rounded text-blue-300 font-mono">cd PYM && docker compose up --build -d</code>
              </p>
            </div>
            <a
              href="https://github.com/ssarioglo/practice_s7"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
            >
              <Download size={16} />
              <span>Репозиторий practice_s7</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border-l-4 border-l-blue-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  PORT 3000
                </span>
                <span className="text-[11px] text-slate-400">SPA / Client</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-frontend</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                React + TypeScript + Vite. Интерактивный SVG-график, реестр БДДС, справочник контрагентов и JSON-импорт.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border-l-4 border-l-emerald-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  PORT 9800
                </span>
                <span className="text-[11px] text-slate-400">Security Edge</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-gateway</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Java 17 + Spring Cloud Gateway (WebFlux). Аутентификация, упаковка JWT в HttpOnly Cookie (Zero-XSS).
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border-l-4 border-l-cyan-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                  PORT 9801
                </span>
                <span className="text-[11px] text-slate-400">Core Orchestrator</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-data-service</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Go (Golang) Clean Architecture. CRUD финансовых правил, справочник контрагентов, прием JSON API пакетов.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border-l-4 border-l-amber-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  PORT 9802
                </span>
                <span className="text-[11px] text-slate-400">Math Engine</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-predictor</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Python 3.10+ FastAPI + Pydantic. Матричное развертывание временного ряда на 30–180 дней и поиск кассовых разрывов.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Shield size={18} className="text-blue-600" />
              <span>Схема прохождения запросов и защита данных (152-ФЗ / Zero-XSS)</span>
            </h4>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
              {`[Браузер / Клиент 1С]
   │ 1. POST /api/v1/operations/batch (Content-Type: application/json, Cookie: jwt-token)
   ▼
[pym-gateway :9800 (Java Spring Cloud)]
   │ 2. Проверка HMAC-SHA256 подписи JWT, извлечение sub -> X-User-Id
   ▼
[pym-data-service :9801 (Go Clean Arch)]
   ├──► 3a. SELECT / INSERT правил и контрагентов -> [PostgreSQL :5432 (finance_schema)]
   └──► 3b. POST /api/v1/predict (JSON)           -> [pym-predictor :9802 (Python FastAPI)]`}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'practice' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900 text-base">
              Структурированный аналитический обзор по Кейс-задачам № 3, № 4 и № 5
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Адаптировано под место прохождения практики: АНО ВО «Московский университет «Синергия» (профиль: Full-stack разработка)
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-blue-700 uppercase tracking-wider text-xs">
              Кейс-задача № 3. Этапы разработки ПО для финансовых технологий (PYM)
            </h4>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Анализ требований:</strong> Выявлена потребность подразделений организации в оперативном прогнозировании ликвидности и предотвращении кассовых разрывов на горизонте 30–180 дней. Сформулированы требования к ведению базы контрагентов, учету циклических операций с произвольным шагом повторения (год, месяц, неделя, 2 недели, каждые N дней), автоматической архивации прошлых записей и пакетному обмену данными в формате <code className="font-mono">application/json</code>.
              </li>
              <li>
                <strong>Проектирование:</strong> Разработана микросервисная архитектура (React SPA + Java Spring Cloud Gateway + Go Data-Service + Python FastAPI Predictor + PostgreSQL с разделением схем <code className="font-mono">auth_schema</code> и <code className="font-mono">finance_schema</code>).
              </li>
              <li>
                <strong>Разработка и Тестирование:</strong> Реализовано математическое ядро расчета дневных матриц ликвидности, интерфейс управления правилами и контрагентами, модуль JSON-импорта и REST API спецификации. Проведено модульное и функциональное тестирование.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-blue-700 uppercase tracking-wider text-xs">
              Кейс-задача № 4. Критерии аналитического обзора
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">Функциональные требования</div>
                Обработка плановых приходов и списаний, ведение справочника контрагентов (ИНН, договоры, р/счета), гибкая настройка цикличности («Раз в: год, месяц, неделю, 2 недели, произвольно через N дней»), автоматический перевод истекших правил в «Архив», пакетный импорт/экспорт в формате <code className="font-mono">application/json</code>.
              </div>
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">Безопасность и регуляторика</div>
                Соответствие 152-ФЗ «О персональных данных» (изоляция учетных данных в <code className="font-mono">auth_schema</code> от финансовых транзакций в <code className="font-mono">finance_schema</code>). Защита сессий по модели Zero-XSS через <code className="font-mono">HttpOnly, Secure, SameSite=Lax</code> Cookie.
              </div>
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">Масштабируемость и производительность</div>
                Временная сложность алгоритма прогнозирования <code className="font-mono">O(D × R)</code> позволяет рассчитывать горизонт 180 дней менее чем за 5 мс. Stateless-ядро Python Predictor допускает горизонтальное масштабирование в Docker.
              </div>
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">Технологическая совместимость</div>
                Стандартизированный REST API (<code className="font-mono">Content-Type: application/json</code>) и файловый шлюз JSON позволяют интегрировать систему с 1С:Предприятие, ERP и CRM-платформами организации.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'defense' && (
        <div className="space-y-4">
          {defenseQuestions.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-2"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <h4 className="font-bold text-slate-900 text-sm">{item.q}</h4>
              </div>
              <p className="text-xs text-slate-600 pl-7 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'code' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 p-3 flex flex-wrap gap-2 text-xs">
            {[
              { id: 'docker-compose', label: 'docker-compose.yml' },
              { id: 'init-sql', label: 'init-db/init.sql (PostgreSQL)' },
              { id: 'python-main', label: 'pym-predictor/main.py (Python)' },
              { id: 'go-main', label: 'pym-data-service/handlers.go (Go)' },
              { id: 'java-filter', label: 'JwtAuthenticationFilter.java' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFile(f.id)}
                className={`px-3 py-1.5 rounded font-mono font-medium transition cursor-pointer ${
                  selectedFile === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px]">
            {selectedFile === 'docker-compose' && (
              <pre>{`version: '3.8'
services:
  pym_db:
    image: postgres:15-alpine
    container_name: pym_db
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: pym_user
      POSTGRES_PASSWORD: pym_password
      POSTGRES_DB: pym_database
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks: [pym-network]

  pym-predictor:
    build: ./pym-predictor
    container_name: pym-predictor
    ports: ["9802:9802"]
    networks: [pym-network]

  pym-data-service:
    build: ./pym-data-service
    container_name: pym-data-service
    ports: ["9801:9801"]
    environment:
      - DB_HOST=pym_db
      - DB_PORT=5432
      - PREDICTOR_URL=http://pym-predictor:9802
    networks: [pym-network]

  pym-gateway:
    build: ./pym-gateway
    container_name: pym-gateway
    ports: ["9800:9800"]
    networks: [pym-network]

  pym-frontend:
    build: ./pym-frontend
    container_name: pym-frontend
    ports: ["3000:80"]
    networks: [pym-network]`}</pre>
            )}
            {selectedFile === 'init-sql' && (
              <pre>{`-- Изолированные пространства имен (Схемы)
CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS finance_schema;

-- Справочник контрагентов организации
CREATE TABLE IF NOT EXISTS finance_schema.counterparties (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    inn VARCHAR(20),
    cp_type VARCHAR(30) DEFAULT 'VENDOR',
    contract_info VARCHAR(200),
    account_number VARCHAR(50)
);

-- Таблица правил и плановых операций ДДС
CREATE TABLE IF NOT EXISTS finance_schema.finance_rules (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    counterparty_id INT,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,         -- 'ONCE' | 'RECURRING'
    interval_type VARCHAR(20) DEFAULT 'MONTH', -- 'MONTH'|'YEAR'|'WEEK'|'BIWEEKLY'|'CUSTOM_DAYS'
    custom_interval_days INT DEFAULT NULL,
    category_type VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL',
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INT
);`}</pre>
            )}
            {selectedFile === 'python-main' && (
              <pre>{`# Python 3.10+ / FastAPI Predictor Service (Port 9802)
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

app = FastAPI(title="PYM Predictor Service")

class FinanceRule(BaseModel):
    id: int
    title: str
    amount: float
    rule_type: str               # "ONCE" | "RECURRING"
    interval_type: Optional[str] = "MONTH" # "MONTH"|"YEAR"|"WEEK"|"BIWEEKLY"|"CUSTOM_DAYS"
    custom_interval_days: Optional[int] = None
    start_date: str
    end_date: Optional[str] = None
    day_of_month: Optional[int] = None`}</pre>
            )}
            {selectedFile === 'go-main' && (
              <pre>{`// Go Clean Architecture Handler in pym-data-service (Port 9801)
// Прием пакетных операций POST /api/v1/operations/batch (application/json)
func (env *Env) handleBatchOperations(w http.ResponseWriter, r *http.Request) {
    userIdStr := r.Header.Get("X-User-Id")
    if userIdStr == "" {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    // Валидация JSON-пакета, синхронизация контрагентов и запись в finance_schema
}`}</pre>
            )}
            {selectedFile === 'java-filter' && (
              <pre>{`// Spring Cloud Gateway Custom Filter (Zero-XSS JWT via Cookie)
@Component("JwtAuthenticationFilterFactory")
public class JwtAuthenticationFilterFactory extends AbstractGatewayFilterFactory<Config> {
    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            HttpCookie jwtCookie = exchange.getRequest().getCookies().getFirst("jwt-token");
            if (jwtCookie == null || !jwtUtil.validateToken(jwtCookie.getValue())) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            String userId = jwtUtil.getAllClaimsFromToken(jwtCookie.getValue()).getSubject();
            ServerHttpRequest mutated = exchange.getRequest().mutate()
                    .header("X-User-Id", userId)
                    .build();
            return chain.filter(exchange.mutate().request(mutated).build());
        };
    }
}`}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
