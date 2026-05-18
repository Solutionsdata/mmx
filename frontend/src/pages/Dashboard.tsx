import { useQuery } from '@tanstack/react-query'
import { kpisAPI } from '../services/api'
import type { KPISummary, InventoryStatus } from '../types'
import {
  TrendingUp, Package, ShoppingCart, Clock, Target,
  AlertTriangle, ZapOff, CheckCircle, RefreshCw,
  ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
} from 'recharts'

const EPR_AZUL = '#1A3A6B'
const EPR_VERDE = '#1B7C3E'
const EPR_AMARELO = '#F5A623'

function KPICard({
  label, value, unit, icon: Icon, color, sub, trend,
}: {
  label: string
  value: string | number | null
  unit?: string
  icon: React.ElementType
  color: string
  sub?: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <div className="kpi-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </span>
        )}
      </div>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value" style={{ color }}>
          {value !== null && value !== undefined ? `${value}${unit ? unit : ''}` : '—'}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: InventoryStatus['status'] }) {
  const map = {
    OK: 'badge-ok',
    LOW: 'badge-low',
    CRITICAL: 'badge-critical',
    ZERO: 'badge-zero',
  }
  const labels = { OK: 'OK', LOW: 'Baixo', CRITICAL: 'Crítico', ZERO: 'Zerado' }
  return <span className={map[status]}>{labels[status]}</span>
}

export default function Dashboard() {
  const { data: kpis, isLoading: kpiLoading } = useQuery<KPISummary>({
    queryKey: ['kpi-summary'],
    queryFn: () => kpisAPI.summary().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: stockStatus, isLoading: stockLoading } = useQuery<InventoryStatus[]>({
    queryKey: ['inventory-status'],
    queryFn: () => kpisAPI.inventoryStatus().then(r => r.data),
    refetchInterval: 60_000,
  })

  const alerts = stockStatus?.filter(s => s.status !== 'OK') ?? []
  const statusCounts = stockStatus
    ? [
        { name: 'Normal', value: stockStatus.filter(s => s.status === 'OK').length, color: EPR_VERDE },
        { name: 'Baixo', value: stockStatus.filter(s => s.status === 'LOW').length, color: EPR_AMARELO },
        { name: 'Crítico', value: stockStatus.filter(s => s.status === 'CRITICAL').length, color: '#ef4444' },
        { name: 'Zerado', value: stockStatus.filter(s => s.status === 'ZERO').length, color: '#6b7280' },
      ].filter(d => d.value > 0)
    : []

  return (
    <div className="page overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={20} style={{ color: EPR_AZUL }} />
          Dashboard — Visão Geral
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">KPIs e status do estoque em tempo real.</p>
      </div>

      {kpiLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8">
          <RefreshCw size={18} className="animate-spin" /> Carregando KPIs…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          <KPICard label="MAPE" value={kpis?.mape ?? null} unit="%" icon={Target} color={EPR_AZUL}
            sub="Erro médio de previsão" />
          <KPICard label="Nível de Serviço" value={kpis?.service_level ?? null} unit="%" icon={CheckCircle} color={EPR_VERDE}
            sub={`${kpis?.total_orders_analyzed ?? 0} pedidos analisados`} />
          <KPICard label="Giro de Estoque" value={kpis?.inventory_turnover ?? null} unit="x" icon={RefreshCw} color={EPR_AMARELO}
            sub="Rotatividade média" />
          <KPICard label="Lead Time" value={kpis?.lead_time_days ?? null} unit=" dias" icon={Clock} color="#7c3aed"
            sub="Prazo médio de entrega" />
          <KPICard label="SLA" value={kpis?.sla ?? null} unit="%" icon={Target} color={EPR_VERDE}
            sub="Conformidade com prazo" />
          <KPICard label="Ruptura de Estoque" value={kpis?.stockout_rate ?? null} unit="%" icon={AlertTriangle} color="#ef4444"
            sub="Frequência de ruptura" />
          <KPICard label="Estoque Zero" value={kpis?.zero_stock_rate ?? null} unit="%" icon={ZapOff} color="#6b7280"
            sub="Períodos zerados" />
          <KPICard label="Produtos" value={kpis?.product_count ?? null} icon={Package} color={EPR_AZUL}
            sub="Itens cadastrados" />
          <KPICard label="Pedidos Ativos" value={kpis?.active_orders ?? null} icon={ShoppingCart} color={EPR_AMARELO}
            sub="Em aberto / trânsito" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Status do estoque */}
        <div className="chart-card lg:col-span-2">
          <div className="chart-header">
            <div>
              <p className="chart-title">Status do Estoque por Produto</p>
              <p className="chart-sub">Produtos abaixo do ponto de reposição ou zerados</p>
            </div>
            {alerts.length > 0 && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                {alerts.length} alertas
              </span>
            )}
          </div>
          <div className="overflow-auto max-h-72">
            {stockLoading ? (
              <div className="flex items-center gap-2 text-gray-400 p-5 text-sm">
                <RefreshCw size={14} className="animate-spin" /> Carregando…
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600 p-5 text-sm">
                <CheckCircle size={16} /> Todos os produtos com estoque OK
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">SKU</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Produto</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Disponível</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Mín. Seg.</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {alerts.map((s) => (
                    <tr key={s.product_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.sku}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[180px] truncate">{s.name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{s.quantity_on_hand.toFixed(1)} {s.unit}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{s.safety_stock.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Distribuição do status */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <p className="chart-title">Distribuição de Status</p>
              <p className="chart-sub">Visão geral do portfólio</p>
            </div>
          </div>
          <div className="p-4 h-56">
            {statusCounts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-300 text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {statusCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} produtos`, '']} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* All products table */}
      {!stockLoading && stockStatus && stockStatus.length > 0 && (
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <p className="chart-title">Todos os Produtos — Posição de Estoque</p>
              <p className="chart-sub">{stockStatus.length} produtos cadastrados</p>
            </div>
          </div>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm table-sticky">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">SKU</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Produto</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Categoria</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Disponível</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">P. Reposição</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Estoque Seg.</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stockStatus.map((s) => (
                  <tr key={s.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{s.category ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{s.quantity_on_hand.toFixed(1)} {s.unit}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{s.reorder_point.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{s.safety_stock.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
