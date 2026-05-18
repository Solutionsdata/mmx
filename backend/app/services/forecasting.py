from typing import List, Optional
import numpy as np


def moving_average(values: List[float], window: int = 3) -> List[float]:
    """Simple moving average forecast. Returns one-step-ahead predictions."""
    if len(values) < window:
        return []
    result = []
    for i in range(window, len(values) + 1):
        result.append(float(np.mean(values[i - window:i])))
    return result


def exponential_smoothing(values: List[float], alpha: float = 0.3) -> List[float]:
    """Single exponential smoothing."""
    if not values:
        return []
    smoothed = [values[0]]
    for v in values[1:]:
        smoothed.append(alpha * v + (1 - alpha) * smoothed[-1])
    return smoothed


def holt_winters(values: List[float], alpha: float = 0.3, beta: float = 0.1) -> List[float]:
    """Double exponential smoothing (Holt's method) for trend."""
    if len(values) < 2:
        return []
    level = [values[0]]
    trend = [values[1] - values[0]]
    fitted = [level[0] + trend[0]]
    for i in range(1, len(values)):
        new_level = alpha * values[i] + (1 - alpha) * (level[-1] + trend[-1])
        new_trend = beta * (new_level - level[-1]) + (1 - beta) * trend[-1]
        level.append(new_level)
        trend.append(new_trend)
        fitted.append(new_level + new_trend)
    return fitted


def linear_regression_forecast(values: List[float], periods_ahead: int = 3) -> List[float]:
    """Linear regression fitted values + forecast ahead."""
    if len(values) < 2:
        return []
    x = np.arange(len(values), dtype=float)
    coeffs = np.polyfit(x, values, 1)
    slope, intercept = coeffs
    fitted = [float(slope * i + intercept) for i in range(len(values))]
    for i in range(1, periods_ahead + 1):
        fitted.append(float(slope * (len(values) + i - 1) + intercept))
    return fitted


def calculate_mape(actual: List[float], predicted: List[float]) -> Optional[float]:
    """Mean Absolute Percentage Error. Returns None if no valid pairs."""
    errors = []
    for a, p in zip(actual, predicted):
        if a != 0:
            errors.append(abs(a - p) / abs(a))
    if not errors:
        return None
    return float(np.mean(errors) * 100)


def forecast_next_periods(
    values: List[float],
    model: str,
    periods: int = 6,
    params: Optional[dict] = None,
) -> List[float]:
    """Generate `periods` future predictions using the chosen model."""
    params = params or {}
    if not values:
        return [0.0] * periods

    if model == "MA":
        window = params.get("window", 3)
        last_window = values[-window:] if len(values) >= window else values
        baseline = float(np.mean(last_window))
        return [baseline] * periods

    if model == "ES":
        alpha = params.get("alpha", 0.3)
        smoothed = exponential_smoothing(values, alpha)
        last = smoothed[-1] if smoothed else values[-1]
        return [last] * periods

    if model == "HW":
        alpha = params.get("alpha", 0.3)
        beta = params.get("beta", 0.1)
        fitted = holt_winters(values, alpha, beta)
        if len(fitted) < 2:
            return [values[-1]] * periods
        level = fitted[-1]
        trend = fitted[-1] - fitted[-2] if len(fitted) >= 2 else 0
        return [max(0.0, level + trend * i) for i in range(1, periods + 1)]

    if model == "LR":
        n = len(values)
        x = np.arange(n, dtype=float)
        coeffs = np.polyfit(x, values, 1)
        slope, intercept = coeffs
        return [max(0.0, float(slope * (n + i) + intercept)) for i in range(periods)]

    return [float(np.mean(values))] * periods
