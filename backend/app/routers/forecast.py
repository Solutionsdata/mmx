from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.demand import DemandHistory
from app.models.forecast import Forecast
from app.models.product import Product
from app.services.forecasting import forecast_next_periods, calculate_mape, exponential_smoothing, moving_average, holt_winters, linear_regression_forecast
from app.deps import get_current_user
from datetime import date, timedelta

router = APIRouter()


class ForecastRequest(BaseModel):
    product_id: int
    model: str = "MA"
    periods: int = 6
    params: Optional[dict] = None


class ForecastResult(BaseModel):
    product_id: int
    model: str
    historical_dates: List[str]
    historical_values: List[float]
    forecast_dates: List[str]
    forecast_values: List[float]
    fitted_values: List[float]
    mape: Optional[float] = None


@router.post("/run", response_model=ForecastResult)
def run_forecast(req: ForecastRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product:
        raise HTTPException(404, "Produto não encontrado")

    history = (
        db.query(DemandHistory)
        .filter(DemandHistory.product_id == req.product_id)
        .order_by(DemandHistory.date)
        .all()
    )
    if len(history) < 3:
        raise HTTPException(400, "Histórico insuficiente (mínimo 3 períodos)")

    dates = [str(h.date) for h in history]
    values = [h.quantity for h in history]
    params = req.params or {}

    # Fitted values (in-sample)
    if req.model == "MA":
        window = params.get("window", 3)
        fitted_raw = moving_average(values, window)
        fitted = [None] * (len(values) - len(fitted_raw)) + fitted_raw
    elif req.model == "ES":
        fitted = exponential_smoothing(values, params.get("alpha", 0.3))
    elif req.model == "HW":
        fitted = holt_winters(values, params.get("alpha", 0.3), params.get("beta", 0.1))
    elif req.model == "LR":
        fitted = linear_regression_forecast(values, 0)
    else:
        fitted = [None] * len(values)

    fitted_clean = [v if v is not None else 0.0 for v in fitted]
    actual_for_mape = [v for v, f in zip(values, fitted) if f is not None]
    fitted_for_mape = [f for f in fitted if f is not None]
    mape = calculate_mape(actual_for_mape, fitted_for_mape)

    # Future forecast
    future_values = forecast_next_periods(values, req.model, req.periods, params)

    # Generate future dates (monthly)
    last_date = history[-1].date
    future_dates = []
    for i in range(1, req.periods + 1):
        next_date = date(last_date.year + (last_date.month + i - 1) // 12,
                         (last_date.month + i - 1) % 12 + 1, 1)
        future_dates.append(str(next_date))

    # Save forecasts to DB
    db.query(Forecast).filter(
        Forecast.product_id == req.product_id,
        Forecast.model == req.model,
        Forecast.forecast_date.in_([date.fromisoformat(d) for d in future_dates]),
    ).delete(synchronize_session=False)
    for fd, fv in zip(future_dates, future_values):
        db.add(Forecast(
            product_id=req.product_id,
            model=req.model,
            forecast_date=date.fromisoformat(fd),
            predicted_qty=fv,
            mape=mape,
        ))
    db.commit()

    return ForecastResult(
        product_id=req.product_id,
        model=req.model,
        historical_dates=dates,
        historical_values=values,
        forecast_dates=future_dates,
        forecast_values=[round(v, 2) for v in future_values],
        fitted_values=[round(v, 2) for v in fitted_clean],
        mape=round(mape, 2) if mape else None,
    )


@router.get("/saved")
def get_saved_forecasts(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Forecast)
    if product_id:
        q = q.filter(Forecast.product_id == product_id)
    return q.order_by(Forecast.forecast_date).limit(500).all()
