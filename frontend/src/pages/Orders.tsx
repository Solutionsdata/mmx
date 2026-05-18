import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersAPI, productsAPI } from '../services/api'
import type { Order, Product } from '../types'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, RefreshCw, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'

const EPR_AZUL = '#1A3A6B'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: 'Pendente',   cls: 'bg-amber-100 text-amber-700' },
  IN_TRANSIT:  { label: 'Em Trânsito', cls: 'bg-blue-100 text-blue-700' },
  RECEIVED:    { label: 'Recebido',   cls: 'bg-green-100 text-green-700' },
  PARTIAL:     { label: 'Parcial',    cls: 'bg-purple-100 text-purple-700' },
  CANCELLED:   { label: 'Cancelado',  cls: 'bg-gray-100 text-gray-500' },
}

export default function Orders() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({
    product_id: '', order_number: '', order_date: new Date().toISOString().slice(0, 10),
    expected_date: '', quantity_ordered: '', unit_cost: '0', sla_days: '', notes: '',
  })

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['orders', filterStatus],
    queryFn: () => ordersAPI.list(filterStatus ? { status: filterStatus } : undefined).then(r => r.data),
  })

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productsAPI.list().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => ordersAPI.create({
      ...form,
      product_id: Number(form.product_id),
      quantity_ordered: Number(form.quantity_ordered),
      unit_cost: Number(form.unit_cost),
      sla_days: form.sla_days ? Number(form.sla_days) : null,
      expected_date: form.expected_date || null,
      order_number: form.order_number || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kpi-summary'] })
      toast.success('Pedido criado!')
      setShowForm(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => ordersAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['kpi-summary'] })
      toast.success('Pedido atualizado')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail ?? 'Erro'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ordersAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Pedido excluído')
    },
  })

  function markReceived(order: Order) {
    updateMutation.mutate({ id: order.id, data: { status: 'RECEIVED', actual_date: new Date().toISOString().slice(0, 10), quantity_received: order.quantity_ordered } })
  }

  return (
    <div className="page overflow-y-auto h-full">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={20} style={{ color: EPR_AZUL }} />
            Pedidos de Compra
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Acompanhe pedidos, lead time e conformidade com SLA.</p>
        </div>
        <button className="btn-primary text-xs" onClick={() => setShowForm(true)}>
          <Plus size={13} /> Novo Pedido
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'IN_TRANSIT', 'RECEIVED', 'PARTIAL', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filterStatus === s ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
          >
            {s ? (STATUS_MAP[s]?.label ?? s) : 'Todos'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 p-6 text-sm"><RefreshCw size={14} className="animate-spin" /> Carregando…</div>
        ) : !orders?.length ? (
          <div className="text-center py-12 text-gray-400 text-sm">Nenhum pedido encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Nº Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Produto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Qtd.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Dt. Pedido</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Dt. Prevista</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Dt. Real</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">SLA</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => {
                const prod = products?.find(p => p.id === o.product_id)
                const st = STATUS_MAP[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{o.order_number ?? `#${o.id}`}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium text-xs">{prod?.name ?? `ID ${o.product_id}`}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{o.quantity_ordered}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{o.order_date}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{o.expected_date ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{o.actual_date ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {o.sla_met === true ? <CheckCircle size={14} className="text-green-500 mx-auto" /> :
                       o.sla_met === false ? <XCircle size={14} className="text-red-500 mx-auto" /> :
                       <Clock size={14} className="text-gray-300 mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {o.status === 'PENDING' || o.status === 'IN_TRANSIT' ? (
                          <button
                            onClick={() => markReceived(o)}
                            disabled={updateMutation.isPending}
                            title="Marcar como recebido"
                            className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            Recebido
                          </button>
                        ) : null}
                        <button onClick={() => { if (confirm('Excluir pedido?')) deleteMutation.mutate(o.id) }} className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Pedido de Compra</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                <select className="input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nº Pedido</label>
                <input className="input" placeholder="OP-001" value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
                <input type="number" min={0.01} step={0.01} className="input" value={form.quantity_ordered} onChange={e => setForm(f => ({ ...f, quantity_ordered: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data do Pedido *</label>
                <input type="date" className="input" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prazo Previsto</label>
                <input type="date" className="input" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SLA (dias)</label>
                <input type="number" min={1} className="input" placeholder="ex: 7" value={form.sla_days} onChange={e => setForm(f => ({ ...f, sla_days: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Custo Unitário</label>
                <input type="number" min={0} step={0.01} className="input" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={() => createMutation.mutate()} disabled={!form.product_id || !form.quantity_ordered || createMutation.isPending} className="btn-primary flex-1 justify-center">
                {createMutation.isPending ? 'Salvando…' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
