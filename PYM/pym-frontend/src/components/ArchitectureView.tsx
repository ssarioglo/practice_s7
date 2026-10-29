import React, { useState } from 'react';
import {
  Server,
  Database,
  Shield,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
  HelpCircle,
  CheckCircle2,
  Terminal,
  FileText,
  Download,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'topology' | 'defense' | 'code'>('topology');
  const [selectedFile, setSelectedFile] = useState<string>('docker-compose');

  const defenseQuestions = [
    {
      q: 'Почему выбрана микросервисная архитектура, а не монолит?',
      a: 'Разделение по принципу Single Responsibility и требованиям к среде выполнения: Java Spring Cloud Gateway обеспечивает реактивную неблокирующую фильтрацию I/O на Netty и управление периметром безопасности; Go-сервис реализует Clean Architecture и высокопроизводительную работу с транзакционной базой данных; Python Predictor выступает stateless-вычислителем для векторных и матричных расчетов временных рядов (с возможностью легкого подключения NumPy/Pandas в будущем) без блокировки основного I/O сервисов.',
    },
    {
      q: 'Почему в PostgreSQL таблицы users и finance_rules разнесены по схемам auth_schema и finance_schema без внешнего ключа (FOREIGN KEY)?',
      a: 'Это фундаментальный паттерн микросервисной архитектуры Database per Service (или Schema per Service). Наличие физического констрейнта FOREIGN KEY между сервисами создает жесткую связность (Tight Coupling) на уровне СУБД. В PYM связь поддерживается логически на уровне приложения через проверенный шлюзом X-User-Id. Это позволяет при масштабировании прозрачно разделить базы auth_db и finance_db на разные физические серверы без переписывания DDL и миграций.',
    },
    {
      q: 'Как организована защита от XSS и утечки токенов?',
      a: 'Токены JWT упаковываются в куку с флагами HttpOnly, Secure и SameSite=Lax на уровне Java Gateway. Браузерный JavaScript не имеет доступа к document.cookie для чтения токена, что полностью нейтрализует угрозу перехвата сессии через сторонние NPM-зависимости или XSS-инъекции. Запросы с фронтенда отправляются с флагом credentials: "include". Внутренний контур доверяет заголовку X-User-Id, который выставляет исключительно Gateway после валидации криптографической подписи.',
    },
    {
      q: 'Каков математический алгоритм развертывания матрицы прогноза?',
      a: 'Алгоритм дискретного суммирования дельт на временной шкале T = 30..180 дней. Для каждого дня рассчитывается суммарная дельта разовых (ONCE) и периодических (RECURRING) правил с учетом дня месяца (day_of_month) и даты погашения (end_date). Баланс дня t рассчитывается как B(t) = B(t-1) + Σ Income(t) - Σ Expense(t). Временная сложность O(D × R), где D — горизонт прогнозирования, R — количество активных правил. Расчет выполняется за миллисекунды.',
    },
    {
      q: 'Как валидируются вебхуки Google Calendar и Telegram Bot?',
      a: 'Вебхук Google проверяется по заголовку X-Goog-Channel-Token через сопоставление со случайным криптографическим секретом пользователя webhook_secret в auth_schema.users. Вебхук Telegram Bot проверяется сверкой HMAC-SHA256 хеша от тела входящего запроса с использованием секретного ключа бота TELEGRAM_BOT_TOKEN, а также по заголовку X-Telegram-Bot-Api-Secret-Token.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-nav tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-t-lg shadow-xs">
        <button
          onClick={() => setActiveTab('topology')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'topology'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={16} /> Топология микросервисов
        </button>
        <button
          onClick={() => setActiveTab('defense')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm border-b-2 transition ${
            activeTab === 'defense'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle size={16} /> Вопросы & Ответы к защите диплома (ВКР)
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm border-b-2 transition ${
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
          {/* Quick Docker Download and Launch Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-5 rounded-xl border border-slate-700/80 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Terminal size={18} />
                </span>
                <h4 className="font-bold text-base text-white">
                  Запуск проекта на вашем компьютере через Docker Compose
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Архив содержит исходники всех 5 сервисов, Dockerfile, DDL PostgreSQL и docker-compose.yml.
                Распакуйте и выполните: <code className="bg-slate-800 px-2 py-0.5 rounded text-blue-300 font-mono">unzip PYM_source.zip && cd PYM && docker compose up --build -d</code>
              </p>
            </div>
            <a
              href="/PYM_source.zip"
              download="PYM_source.zip"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
            >
              <Download size={16} />
              <span>Скачать PYM_source.zip</span>
            </a>
          </div>

          {/* Microservices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Frontend */}
            <div className="bg-white p-5 rounded-lg border-l-4 border-l-blue-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  PORT 3000
                </span>
                <span className="text-[11px] text-slate-400">SPA / Client</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-frontend</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                React 18 + Vite + Bootstrap 5 / SB Admin 2 + Nginx. Data Enrichment и кастомный SVG-график.
              </p>
              <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded">
                Credentials: 'include' (Cookie)
              </div>
            </div>

            {/* Gateway */}
            <div className="bg-white p-5 rounded-lg border-l-4 border-l-purple-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  PORT 9800
                </span>
                <span className="text-[11px] text-slate-400">Gateway / Security</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-gateway</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Java 17 + Spring Cloud Gateway + WebFlux (Netty). JWT в HttpOnly Cookie, фильтр X-User-Id.
              </p>
              <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded">
                R2DBC: auth_schema.users
              </div>
            </div>

            {/* Go Data Service */}
            <div className="bg-white p-5 rounded-lg border-l-4 border-l-cyan-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                  PORT 9801
                </span>
                <span className="text-[11px] text-slate-400">Core Data / Rules</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-data-service</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Go (Golang), Clean Architecture, net/http, lib/pq. Роутер вебхуков Google/Telegram.
              </p>
              <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded">
                SQL: finance_schema.finance_rules
              </div>
            </div>

            {/* Python Predictor */}
            <div className="bg-white p-5 rounded-lg border-l-4 border-l-emerald-500 border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  PORT 9802
                </span>
                <span className="text-[11px] text-slate-400">Math Kernel</span>
              </div>
              <h4 className="font-bold text-slate-900 text-base">pym-predictor</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Python 3.10+ + FastAPI + Pydantic. Алгоритм дискретного развертывания матрицы баланса.
              </p>
              <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded">
                POST /api/v1/predict (Stateless)
              </div>
            </div>
          </div>

          {/* Database & Security Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
                <Database className="text-blue-600" size={18} />
                <span>СУБД PostgreSQL: Схемная изоляция данных</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                База данных <code>pym_database</code> разделена на изолированные пространства имен.
                Ключевой архитектурный паттерн — отсутствие межсхемного <code>FOREIGN KEY</code>:
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="font-bold text-purple-700 font-mono mb-1">auth_schema.users</div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                    <li>id (PK, SERIAL)</li>
                    <li>email (UNIQUE)</li>
                    <li>password_hash (BCrypt)</li>
                    <li>webhook_secret (UUID)</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="font-bold text-cyan-700 font-mono mb-1">finance_schema.finance_rules</div>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                    <li>id (PK, SERIAL)</li>
                    <li>user_id (INT, логическая связь)</li>
                    <li>amount (NUMERIC 12,2)</li>
                    <li>rule_type (ONCE/RECURRING)</li>
                    <li>idx_finance_rules_user (INDEX)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
                <Shield className="text-emerald-600" size={18} />
                <span>Модель безопасности и Zero-XSS Architecture</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>HttpOnly Cookie:</strong> Токен JWT не виден JavaScript, исключая кражу сессии через XSS-атаки в браузерных пакетах.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>SameSite=Lax & Secure:</strong> Защита от межсайтовой подделки запросов (CSRF) в современных браузерах.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>HMAC-SHA256 Webhook Verification:</strong> Верификация криптографической подписи входящих сообщений от Telegram Bot.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Периметральная изоляция:</strong> Внутренние микросервисы (Go, Python, Postgres) закрыты в docker-сети <code>pym-network</code>.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'defense' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h3 className="font-bold text-slate-900 text-lg">
              База знаний для защиты дипломного проекта перед комиссией (ГАК)
            </h3>
            <p className="text-xs text-slate-500">
              Четкие формулировки и аргументация принятых инженерных и архитектурных решений.
            </p>
          </div>

          <div className="space-y-4">
            {defenseQuestions.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start gap-2 font-semibold text-slate-900 text-sm mb-2">
                  <span className="text-blue-600 font-mono font-bold">В{idx + 1}:</span>
                  <span>{item.q}</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed pl-6 border-l-2 border-l-blue-400">
                  <strong>Ответ разработчика:</strong> {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'code' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2 text-xs">
            {[
              { id: 'docker-compose', label: 'docker-compose.yml' },
              { id: 'init-sql', label: 'init-db/init.sql' },
              { id: 'go-main', label: 'pym-data-service/cmd/main.go' },
              { id: 'python-main', label: 'pym-predictor/main.py' },
              { id: 'java-security', label: 'pym-gateway/SecurityConfig.java' },
              { id: 'java-filter', label: 'pym-gateway/JwtFilter.java' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFile(f.id)}
                className={`px-3 py-1.5 rounded font-mono font-medium transition ${
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

-- Таблица пользователей (Java / Spring Gateway)
CREATE TABLE IF NOT EXISTS auth_schema.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица правил движения денег (Go Data Service)
-- Намеренное отсутствие физического FOREIGN KEY для слабой связанности
CREATE TABLE IF NOT EXISTS finance_schema.finance_rules (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,       -- 'ONCE' | 'RECURRING'
    category_type VARCHAR(20) NOT NULL DEFAULT 'COMMON', -- 'COMMON' | 'CREDIT'
    start_date DATE NOT NULL,
    end_date DATE,                        -- Для кредитов и сплитов
    day_of_month INT,                     -- Число месяца (1..31)
    external_id VARCHAR(255) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_rules_user ON finance_schema.finance_rules(user_id);`}</pre>
            )}

            {selectedFile === 'python-main' && (
              <pre>{`# Python 3.10+ / FastAPI Predictor Service (Port 9802)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

app = FastAPI(title="PYM Predictor Service")

class FinanceRule(BaseModel):
    id: int
    title: str
    amount: float
    rule_type: str       # "ONCE" или "RECURRING"
    category_type: str   # "COMMON" или "CREDIT"
    start_date: str
    end_date: Optional[str] = None
    day_of_month: Optional[int] = None

class PredictRequest(BaseModel):
    current_balance: float
    start_date: str
    period_days: int
    rules: List[FinanceRule]

@app.post("/api/v1/predict")
def calculate_predict(req: PredictRequest):
    start_dt = datetime.strptime(req.start_date, "%Y-%m-%d")
    current_bal = req.current_balance
    points = []
    
    for day_offset in range(req.period_days + 1):
        current_day = start_dt + timedelta(days=day_offset)
        current_day_str = current_day.strftime("%Y-%m-%d")
        day_delta = 0.0
        
        for rule in req.rules:
            rule_start = datetime.strptime(rule.start_date, "%Y-%m-%d")
            rule_end = datetime.strptime(rule.end_date, "%Y-%m-%d") if rule.end_date else None
            
            if rule.rule_type == "ONCE" and rule.start_date == current_day_str:
                day_delta += rule.amount
            elif rule.rule_type == "RECURRING":
                if current_day >= rule_start and (rule_end is None or current_day <= rule_end):
                    if rule.day_of_month == current_day.day:
                        day_delta += rule.amount
                        
        current_bal += day_delta
        points.append({"date": current_day_str, "balance": round(current_bal, 2)})
        
    return {"points": points}`}</pre>
            )}

            {selectedFile === 'go-main' && (
              <pre>{`// Go Clean Architecture Handler in pym-data-service (Port 9801)
func (env *Env) handleForecast(w http.ResponseWriter, r *http.Request) {
    userIdStr := r.Header.Get("X-User-Id")
    if userIdStr == "" {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    userID, _ := strconv.Atoi(userIdStr)
    
    // Чтение динамических параметров фронтенда
    queryParams := r.URL.Query()
    currentBalance, _ := strconv.ParseFloat(queryParams.Get("initialBalance"), 64)
    startDate := queryParams.Get("startDate")
    periodDays, _ := strconv.Atoi(queryParams.Get("periodDays"))
    
    // Запрос правил из изолированной схемы finance_schema
    rows, err := env.db.Query(\`SELECT id, user_id, title, amount, rule_type, category_type,
        start_date, end_date, day_of_month, external_id FROM finance_schema.finance_rules WHERE user_id = $1\`, userID)
    // ...
    
    // Проксирование в Python Predictor
    predictReq := models.PredictRequest{
        CurrentBalance: currentBalance,
        StartDate:      startDate,
        PeriodDays:     periodDays,
        Rules:          rules,
    }
    // resp, err := http.Post(pythonURL, "application/json", bytes.NewBuffer(jsonData))
}`}</pre>
            )}

            {selectedFile === 'java-security' && (
              <pre>{`// Java Spring Security WebFlux Configuration
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true); // Разрешение передачи Cookie
        config.addAllowedOrigin("http://localhost:3000");
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        // ...
        return source;
    }
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
            
            // Проброс проверенного заголовка во внутренний контур к Go-сервису
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
