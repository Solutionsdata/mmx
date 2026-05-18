from typing import List, Optional
import numpy as np
from datetime import date


def calc_mape(actual: List[float], predicted: List[float]) -> Optional[float]:
    errors = [abs(a - p) / abs(a) for a, p in zip(actual, predicted) if a != 0]
    return float(np.mean(errors) * 100) if errors else None


def calc_service_level(orders_total: int, orders_fulfilled_on_time: int) -> Optional[float]:
    if orders_total == 0:
        return None
    return round(orders_fulfilled_on_time / orders_total * 100, 2)


def calc_inventory_turnover(total_cost_of_goods_sold: float, avg_inventory_value: float) -> Optional[float]:
    if avg_inventory_value == 0:
        return None
    return round(total_cost_of_goods_sold / avg_inventory_value, 2)


def calc_lead_time(order_dates: List[date], receipt_dates: List[date]) -> Optional[float]:
    if not order_dates:
        return None
    days = [(r - o).days for o, r in zip(order_dates, receipt_dates) if r and o]
    return round(float(np.mean(days)), 1) if days else None


def calc_sla(sla_met_list: List[bool]) -> Optional[float]:
    if not sla_met_list:
        return None
    return round(sum(sla_met_list) / len(sla_met_list) * 100, 2)


def calc_stockout_rate(stockout_periods: int, total_periods: int) -> Optional[float]:
    if total_periods == 0:
        return None
    return round(stockout_periods / total_periods * 100, 2)


def calc_zero_stock_rate(zero_periods: int, total_periods: int) -> Optional[float]:
    if total_periods == 0:
        return None
    return round(zero_periods / total_periods * 100, 2)
