from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import calendar

app = FastAPI(title="PYM Predictor Service")


class FinanceRule(BaseModel):
    id: int
    title: str
    amount: float
    rule_type: str  # ONCE или RECURRING
    interval_type: Optional[str] = "MONTH"
    custom_interval_days: Optional[int] = None
    category_type: str = "OPERATIONAL"
    start_date: str
    end_date: Optional[str] = None
    day_of_month: Optional[int] = None
    active: Optional[bool] = True


class PredictRequest(BaseModel):
    current_balance: float
    start_date: str
    period_days: int
    rules: List[FinanceRule]


@app.post("/api/v1/predict")
def calculate_predict(req: PredictRequest):
    try:
        start_dt = datetime.strptime(req.start_date, "%Y-%m-%d")
        current_bal = req.current_balance
        points = []

        for day_offset in range(req.period_days):
            current_day = start_dt + timedelta(days=day_offset)
            current_day_str = current_day.strftime("%Y-%m-%d")
            days_in_month = calendar.monthrange(current_day.year, current_day.month)[1]

            day_delta = 0.0

            for rule in req.rules:
                if rule.active is False:
                    continue

                rule_start = datetime.strptime(rule.start_date, "%Y-%m-%d")
                rule_end = datetime.strptime(rule.end_date, "%Y-%m-%d") if rule.end_date else None

                # пропускаем старые архивные записи до даты старта
                if rule.rule_type == "ONCE" and rule_start < start_dt:
                    continue
                if rule.rule_type == "RECURRING" and rule_end and rule_end < start_dt:
                    continue

                if rule.rule_type == "ONCE":
                    if rule.start_date == current_day_str:
                        day_delta += rule.amount

                elif rule.rule_type == "RECURRING":
                    if current_day < rule_start:
                        continue
                    if rule_end and current_day > rule_end:
                        continue

                    interval = (rule.interval_type or "MONTH").upper()
                    if interval == "MONTH":
                        target_day = min(rule.day_of_month or 1, days_in_month)
                        if current_day.day == target_day:
                            day_delta += rule.amount
                    elif interval == "YEAR":
                        target_day = min(rule_start.day, days_in_month)
                        if current_day.month == rule_start.month and current_day.day == target_day:
                            day_delta += rule.amount
                    elif interval in ("WEEK", "BIWEEKLY", "CUSTOM_DAYS"):
                        diff_days = (current_day - rule_start).days
                        step = 7 if interval == "WEEK" else (14 if interval == "BIWEEKLY" else max(1, rule.custom_interval_days or 2))
                        if diff_days >= 0 and diff_days % step == 0:
                            day_delta += rule.amount

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
    uvicorn.run(app, host="0.0.0.0", port=9802)
