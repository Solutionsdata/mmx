import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { productsAPI, inventoryAPI, forecastAPI } from '../services/api'
import type { Product, ForecastResult } from '../types'
import toast from 'react-hot-toast'
import {
  TrendingUp, Play, RefreshCw, Info, ChevronDown,
} from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'

const EPR_AZUL = '#1A3A6B'
const EPR_VERDE = '#1B7C3E'
const EPR_AMARELO = '#F5A623'

const MODELS = [
  { value: 'MA', label: 'Média Móvel (MA)', desc: 'Simples e estável. Ideal para séries sem tendência.' },
  { value: 'ES', label: 'Suavização Exponencial (SE)', desc: 'Dá mais peso a dados recentes. Bom para variações lentas.' },
  { value: 'HW', label: 'Holt-Winters (Tendência)', desc: 'Captura tendência linear. Ideal para demanda crescente/decrescente.' },
  { value: 'LR', label: 'Regressão Linear (LR)', desc: 'Ajuste linear por mínimos quadrados. Excelente para tendências claras.' },
]

function MapeChip({ value }: { value: number | null }) {
  if (value === null) return null
  const color = value < 15 ? 'text-green-700 bg-green-50 border-green-200'
    : value < 30 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      MAPE: {value.toFixed(1)}%
    </span>
  )
}

export default function Forecasting() {
  const [productId, setProductId] = useState<number | null>(null)
  const [model, setModel] = useState('MA')
  const [periods, setPeriods] = useState(6)
  const [params, setParams] = useState<Record<string, number>>({ window: 3, alpha: 0.3, beta: 0.1 })
  const [result, setResult] = useState<ForecastResult | null>(null)

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productsAPI.list().then(r => r.data),
  })

  const runMutation = useMutation({
    mutationFn: () => forecastAPI.run({ product_id: productId, model, periods, params }),
    onSuccess: (res) => {
      setResult(res.data)
      toast.success('Previsão gerada com sucesso!')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro ao gerar previsão'),
  })

  const chartData = result
    ? [
        ...result.historical_dates.map((d, i) => ({
          date: d.slice(0, 7),
          real: result.historical_values[i],
          ajustado: result.fitted_values[i],
          tipo: 'hist',
        })),
        ...result.forecast_dates.map((d, i) => ({
          date: d.slice(0, 7),
          previsto: result.forecast_values[i],
          tipo: 'forecast',
        })),
      ]
    : []

  const splitIdx = result ? result.historical_dates.length - 1 : 0
  const splitDate = result ? result.historical_dates[splitIdx]?.slice(0, 7) : undefined

  return (
    <div className="page overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={20} style={{ color: EPR_AZUL }} />
          Módulo de Previsão de Demanda
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Gere previsões usando modelos estatísticos e avalie o erro via MAPE.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config panel */}
        <div className="card p-5 space-y-5">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            Configurar Previsão
          </p>

          {/* Product */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
            <select
              className="input"
              value={productId ?? ''}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Selecione um produto…</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
            <div className="space-y-2">
              {MODELS.map(m => (
                <label
                  key={m.value}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    model === m.value
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={m.value}
                    checked={model === m.value}
                    onChange={() => setModel(m.value)}
                    className="mt-0.5 accent-blue-700"
                  />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{m.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Params */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Parâmetros</label>
            <div className="space-y-2">
              {model === 'MA' && (
                <div>
                  <label className="text-xs text-gray-500">Janela (períodos)</label>
                  <input type="number" min={2} max={24} className="input mt-1" value={params.window}
                    onChange={(e) => setParams(p => ({ ...p, window: Number(e.target.value) }))} />
                </div>
              )}
              {(model === 'ES' || model === 'HW') && (
                <div>
                  <label className="text-xs text-gray-500">Alpha (nível)</label>
                  <input type="number" min={0.01} max={1} step={0.05} className="input mt-1" value={params.alpha}
                    onChange={(e) => setParams(p => ({ ...p, alpha: Number(e.target.value) }))} />
                </div>
              )}
              {model === 'HW' && (
                <div>
                  <label className="text-xs text-gray-500">Beta (tendência)</label>
                  <input type="number" min={0.01} max={1} step={0.05} className="input mt-1" value={params.beta}
                    onChange={(e) => setParams(p => ({ ...p, beta: Number(e.target.value) }))} />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">Períodos à frente</label>
                <input type="number" min={1} max={24} className="input mt-1" value={periods}
                  onChange={(e) => setPeriods(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <button
            className="btn-primary w-full justify-center py-2.5"
            disabled={!productId || runMutation.isPending}
            onClick={() => runMutation.mutate()}
          >
            {runMutation.isPending ? (
              <><RefreshCw size={14} className="animate-spin" /> Calculando…</>
            ) : (
              <><Play size={14} /> Gerar Previsão</>
            )}
          </button>
        </div>

        {/* Chart area */}
        <div className="lg:col-span-2 space-y-5">
          {!result ? (
            <div className="chart-card h-96 flex items-center justify-center">
              <div className="text-center text-gray-300">
                <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione um produto e gere a previsão.</p>
              </div>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-3 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Modelo</p>
                  <p className="text-sm font-bold" style={{ color: EPR_AZUL }}>{result.model}</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">MAPE</p>
                  <p className={`text-sm font-bold ${result.mape && result.mape < 15 ? 'text-green-600' : result.mape && result.mape < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                    {result.mape !== null ? `${result.mape.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Períodos</p>
                  <p className="text-sm font-bold" style={{ color: EPR_VERDE }}>{periods}</p>
                </div>
              </div>

              {/* Main chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <p className="chart-title">Histórico de Demanda + Previsão</p>
                    <p className="chart-sub">Linha azul = histórico real · Laranja = ajustado in-sample · Verde = previsão futura</p>
                  </div>
                  <MapeChip value={result.mape} />
                </div>
                <div className="p-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend iconSize={10} />
                      {splitDate && (
                        <ReferenceLine x={splitDate} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Hoje', fontSize: 10 }} />
                      )}
                      <Bar dataKey="real" name="Real" fill={EPR_AZUL} opacity={0.7} radius={[3,3,0,0]} />
                      <Line dataKey="ajustado" name="Ajustado" stroke={EPR_AMARELO} strokeWidth={2} dot={false} connectNulls />
                      <Line dataKey="previsto" name="Previsto" stroke={EPR_VERDE} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4, fill: EPR_VERDE }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Forecast table */}
              <div className="chart-card">
                <div className="chart-header">
                  <p className="chart-title">Previsão Detalhada</p>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Período</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Qtd. Prevista</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {result.forecast_dates.map((d, i) => (
                        <tr key={d} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">{d.slice(0, 7)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: EPR_VERDE }}>
                            {result.forecast_values[i].toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
