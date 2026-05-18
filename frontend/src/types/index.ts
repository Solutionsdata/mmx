export interface User {
  id: number
  nome: string
  email: string
  empresa?: string
  cargo?: string
  is_active: boolean
  is_admin: boolean
  assinatura_ate?: string | null
  created_at: string
}

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  category?: string
  unit: string
  unit_cost: number
  min_stock: number
  max_stock?: number
  reorder_point: number
  safety_stock: number
  lead_time_days: number
  supplier_id?: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: number
  name: string
  contact?: string
  country?: string
  lead_time_days: number
  created_at: string
}

export interface InventoryLevel {
  id: number
  product_id: number
  date: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  created_at: string
}

export interface InventoryTransaction {
  id: number
  product_id: number
  transaction_type: string
  quantity: number
  reference?: string
  date: string
  notes?: string
  created_at: string
}

export interface DemandRecord {
  id: number
  product_id: number
  date: string
  quantity: number
  source: string
  created_at: string
}

export interface Order {
  id: number
  product_id: number
  supplier_id?: number
  order_number?: string
  order_date: string
  expected_date?: string
  actual_date?: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  status: string
  sla_days?: number
  sla_met?: boolean
  notes?: string
  created_at: string
}

export interface KPISummary {
  mape: number | null
  service_level: number | null
  inventory_turnover: number | null
  lead_time_days: number | null
  sla: number | null
  stockout_rate: number | null
  zero_stock_rate: number | null
  product_count: number
  active_orders: number
  total_orders_analyzed: number
}

export interface InventoryStatus {
  product_id: number
  sku: string
  name: string
  category?: string
  quantity_on_hand: number
  safety_stock: number
  reorder_point: number
  min_stock: number
  unit: string
  unit_cost: number
  status: 'OK' | 'LOW' | 'CRITICAL' | 'ZERO'
  last_date?: string
}

export interface ForecastResult {
  product_id: number
  model: string
  historical_dates: string[]
  historical_values: number[]
  forecast_dates: string[]
  forecast_values: number[]
  fitted_values: number[]
  mape: number | null
}
