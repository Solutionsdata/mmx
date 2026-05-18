import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsAPI, inventoryAPI } from '../services/api'
import type { Product, InventoryStatus, InventoryTransaction, DemandRecord } from '../types'
import { kpisAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Package, Plus, Trash2, RefreshCw, Filter,
  ArrowDownToLine, ArrowUpFromLine, AlertTriangle,
  ChevronDown, BarChart3,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const EPR_AZUL = '#1A3A6B'
const EPR_VERDE = '#1B7C3E'
const EPR_AMARELO = '#F5A623'

const TX_TYPES = [
  { value: 'IN', label: 'Entrada', icon: ArrowDownToLine, color: 'text-green-600' },
  { value: 'OUT', label: 'Saída', icon: ArrowUpFromLine, color: 'text-red-500' },
  { value: 'ADJUSTMENT', label: 'Ajuste', icon: RefreshCw, color: 'text-blue-500' },
  { value: 'STOCKOUT', label: 'Ruptura', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'RETURN', label: 'Devolução', icon: ArrowDownToLine, color: 'text-purple-500' },
]

function TxTypeBadge({ type }: { type: string }) {
  const t = TX_TYPES.find(x => x.value === type)
  if (!t) return <span className="text-xs text-gray-400">{type}</span>
  const { icon: Icon, color, label } = t
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon size={11} /> {label}
    </span>
  )
}

export default function Inventory() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'stock' | 'transactions' | 'demand' | 'products'>('stock')
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [showTxForm, setShowTxForm] = useState(false)
  const [showDemandForm, setShowDemandForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)

  const [txForm, setTxForm] = useState({ product_id: '', transaction_type: 'IN', quantity: '', date: new Date().toISOString().slice(0, 10), reference: '', notes: '' })
  const [demandForm, setDemandForm] = useState({ product_id: '', date: new Date().toISOString().slice(0, 10), quantity: '' })
  const [productForm, setProductForm] = useState({ sku: '', name: '', category: '', unit: 'UN', unit_cost: '0', min_stock: '0', safety_stock: '0', reorder_point: '0', lead_time_days: '0' })

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productsAPI.list().then(r => r.data),
  })

  const { data: stockStatus, isLoading: stockLoading } = useQuery<InventoryStatus[]>({
    queryKey: ['inventory-status'],
    queryFn: () => kpisAPI.inventoryStatus().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: transactions, isLoading: txLoading } = useQuery<InventoryTransaction[]>({
    queryKey: ['transactions', selectedProduct],
    queryFn: () => inventoryAPI.listTransactions(selectedProduct ?? undefined).then(r => r.data),
  })

  const { data: demand, isLoading: demandLoading } = useQuery<DemandRecord[]>({
    queryKey: ['demand', selectedProduct],
    queryFn: () => inventoryAPI.listDemand(selectedProduct ?? undefined).then(r => r.data),
  })

  const createTxMutation = useMutation({
    mutationFn: () => inventoryAPI.createTransaction({
      ...txForm,
      product_id: Number(txForm.product_id),
      quantity: Number(txForm.quantity),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
      toast.success('Movimentação registrada')
      setShowTxForm(false)
      setTxForm(f => ({ ...f, quantity: '', reference: '', notes: '' }))
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro'),
  })

  const createDemandMutation = useMutation({
    mutationFn: () => inventoryAPI.createDemand({
      product_id: Number(demandForm.product_id),
      date: demandForm.date,
      quantity: Number(demandForm.quantity),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demand'] })
      toast.success('Demanda registrada')
      setShowDemandForm(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro'),
  })

  const createProductMutation = useMutation({
    mutationFn: () => productsAPI.create({
      ...productForm,
      unit_cost: Number(productForm.unit_cost),
      min_stock: Number(productForm.min_stock),
      safety_stock: Number(productForm.safety_stock),
      reorder_point: Number(productForm.reorder_point),
      lead_time_days: Number(productForm.lead_time_days),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
      toast.success('Produto criado!')
      setShowProductForm(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro'),
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory-status'] })
      toast.success('Produto excluído')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro'),
  })

  const deleteDemandMutation = useMutation({
    mutationFn: (id: number) => inventoryAPI.deleteDemand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demand'] }),
  })

  const TABS = [
    { key: 'stock', label: 'Status do Estoque' },
    { key: 'transactions', label: 'Movimentações' },
    { key: 'demand', label: 'Histórico de Demanda' },
    { key: 'products', label: 'Produtos' },
  ] as const

  return (
    <div className="page overflow-y-auto h-full">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={20} style={{ color: EPR_AZUL }} />
            Gestão de Estoque
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Posições de estoque, movimentações e histórico de demanda.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => setShowTxForm(true)}>
            <Plus size={13} /> Movimentação
          </button>
          <button className="btn-green text-xs" onClick={() => setShowDemandForm(true)}>
            <Plus size={13} /> Demanda
          </button>
          <button className="btn-primary text-xs" onClick={() => setShowProductForm(true)}>
            <Plus size={13} /> Produto
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Product filter */}
      {(tab === 'transactions' || tab === 'demand') && (
        <div className="mb-4 flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select className="input w-64 text-xs" value={selectedProduct ?? ''} onChange={e => setSelectedProduct(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Todos os produtos</option>
            {products?.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
        </div>
      )}

      {/* Tab content */}
      {tab === 'stock' && (
        <div className="card overflow-hidden shadow-sm">
          {stockLoading ? (
            <div className="flex items-center gap-2 text-gray-400 p-6 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
          ) : !stockStatus?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum produto cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Disponível</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Seg.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Reposição</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stockStatus.map(s => {
                  const statusClasses = { OK: 'badge-ok', LOW: 'badge-low', CRITICAL: 'badge-critical', ZERO: 'badge-zero' }
                  const statusLabels = { OK: 'OK', LOW: 'Baixo', CRITICAL: 'Crítico', ZERO: 'Zerado' }
                  return (
                    <tr key={s.product_id} className={`hover:bg-gray-50 ${s.status === 'ZERO' ? 'bg-gray-50/60' : s.status === 'CRITICAL' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{s.category ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{s.quantity_on_hand.toFixed(1)} <span className="text-gray-400 font-normal text-xs">{s.unit}</span></td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">{s.safety_stock.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">{s.reorder_point.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={statusClasses[s.status]}>{statusLabels[s.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">{s.last_date ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card overflow-hidden shadow-sm">
          {txLoading ? (
            <div className="flex items-center gap-2 text-gray-400 p-6 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
          ) : !transactions?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhuma movimentação registrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Quantidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Referência</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.date}</td>
                    <td className="px-4 py-2.5"><TxTypeBadge type={t.transaction_type} /></td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${t.transaction_type === 'OUT' || t.transaction_type === 'STOCKOUT' ? 'text-red-600' : 'text-green-600'}`}>
                      {t.transaction_type === 'OUT' || t.transaction_type === 'STOCKOUT' ? '−' : '+'}{Math.abs(t.quantity).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{t.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'demand' && (
        <div className="card overflow-hidden shadow-sm">
          {demandLoading ? (
            <div className="flex items-center gap-2 text-gray-400 p-6 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
          ) : !demand?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum histórico de demanda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Data</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Quantidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Fonte</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demand.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{d.date}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{d.quantity.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{d.source}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => deleteDemandMutation.mutate(d.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="card overflow-hidden shadow-sm">
          {productsLoading ? (
            <div className="flex items-center gap-2 text-gray-400 p-6 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
          ) : !products?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum produto cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Categoria</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Un.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Custo Unit.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Lead Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{p.category ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{p.unit}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">
                      {p.unit_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{p.lead_time_days}d</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => { if (confirm('Excluir produto?')) deleteProductMutation.mutate(p.id) }} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Transaction modal */}
      {showTxForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Movimentação</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                <select className="input" value={txForm.product_id} onChange={e => setTxForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                  <select className="input" value={txForm.transaction_type} onChange={e => setTxForm(f => ({ ...f, transaction_type: e.target.value }))}>
                    {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                  <input type="number" className="input" value={txForm.quantity} onChange={e => setTxForm(f => ({ ...f, quantity: e.target.value }))} min={0} step={0.01} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                <input type="date" className="input" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Referência</label>
                <input className="input" placeholder="Nº NF, pedido…" value={txForm.reference} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTxForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => createTxMutation.mutate()} disabled={!txForm.product_id || !txForm.quantity || createTxMutation.isPending} className="btn-primary flex-1 justify-center">
                {createTxMutation.isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demand modal */}
      {showDemandForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar Demanda</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                <select className="input" value={demandForm.product_id} onChange={e => setDemandForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                  <input type="date" className="input" value={demandForm.date} onChange={e => setDemandForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                  <input type="number" className="input" value={demandForm.quantity} onChange={e => setDemandForm(f => ({ ...f, quantity: e.target.value }))} min={0} step={0.01} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowDemandForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => createDemandMutation.mutate()} disabled={!demandForm.product_id || !demandForm.quantity || createDemandMutation.isPending} className="btn-green flex-1 justify-center">
                {createDemandMutation.isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Produto</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SKU *</label>
                <input className="input" placeholder="ex: SKU-001" value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input className="input" placeholder="Nome do produto" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <input className="input" placeholder="ex: Matéria-prima" value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                <input className="input" placeholder="UN, KG, L…" value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Custo Unitário</label>
                <input type="number" min={0} step={0.01} className="input" value={productForm.unit_cost} onChange={e => setProductForm(f => ({ ...f, unit_cost: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lead Time (dias)</label>
                <input type="number" min={0} className="input" value={productForm.lead_time_days} onChange={e => setProductForm(f => ({ ...f, lead_time_days: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estoque Segurança</label>
                <input type="number" min={0} step={0.1} className="input" value={productForm.safety_stock} onChange={e => setProductForm(f => ({ ...f, safety_stock: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ponto de Reposição</label>
                <input type="number" min={0} step={0.1} className="input" value={productForm.reorder_point} onChange={e => setProductForm(f => ({ ...f, reorder_point: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowProductForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => createProductMutation.mutate()} disabled={!productForm.sku || !productForm.name || createProductMutation.isPending} className="btn-primary flex-1 justify-center">
                {createProductMutation.isPending ? 'Salvando…' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
