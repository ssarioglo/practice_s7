from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

app = FastAPI(title="PYM Predictor Service")

# Структура финансового правила (полная копия структуры из Go)
class FinanceRule(BaseModel):
    id: int
    title: str
    amount: float
    rule_type: str       # "ONCE" (разовый) или "RECURRING" (циклический)
    category_type: str   # "COMMON" или "CREDIT"
    start_date: str      # YYYY-MM-DD
    end_date: Optional[str] = None
    day_of_month: Optional[int] = None

# Структура входящего запроса от Go-сервиса
class PredictRequest(BaseModel):
    current_balance: float
    start_date: str
    period_days: int
    rules: List[FinanceRule]

@app.post("/api/v1/predict")
def calculate_predict(req: PredictRequest):
    try:
        # Парсим стартовую дату и баланс
        start_dt = datetime.strptime(req.start_date, "%Y-%m-%d")
        current_bal = req.current_balance
        points = []
        
        # Эмуляция Excel: идем по дням вперед (на сколько попросил Go, обычно 90 дней)
        for day_offset in range(req.period_days + 1):
            current_day = start_dt + timedelta(days=day_offset)
            current_day_str = current_day.strftime("%Y-%m-%d")
            
            day_delta = 0.0
            
            # Проверяем каждое правило для текущего дня цикла
            for rule in req.rules:
                rule_start = datetime.strptime(rule.start_date, "%Y-%m-%d")
                rule_end = datetime.strptime(rule.end_date, "%Y-%m-%d") if rule.end_date else None
                
                # 1. Логика для РАЗОВЫХ трат/доходов
                if rule.rule_type == "ONCE" and rule.start_date == current_day_str:
                    day_delta += rule.amount
                    
                # 2. Логика для ЦИКЛИЧЕСКИХ трат/доходов (Сплиты, зарплаты, подписки)
                elif rule.rule_type == "RECURRING":
                    # Проверяем, входит ли день в активный период действия правила
                    if current_day >= rule_start and (rule_end is None or current_day <= rule_end):
                        # Списываем/начисляем только в заданный день месяца (например, 16-го числа)
                        if rule.day_of_month == current_day.day:
                            day_delta += rule.amount

            # Обновляем баланс текущего дня и сохраняем точку для графика
            current_bal += day_delta
            points.append({
                "date": current_day_str,
                "balance": round(current_bal, 2)
            })
            
        return {"points": points}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка расчета прогноза: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Запускаем локально на выделенном порту 9802
    uvicorn.run(app, host="0.0.0.0", port=9802)
