import { useState, useRef } from 'react'
import { importAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle,
  AlertTriangle, Download, ChevronDown, ChevronUp,
} from 'lucide-react'

const EPR_AZUL = '#1A3A6B'

interface ImportType {
  key: 'products' | 'demand' | 'inventory'
  label: string
  desc: string
  columns: string[]
  example: string[][]
}

const IMPORT_TYPES: ImportType[] = [
  {
    key: 'products',
    label: 'Produtos / Cadastro',
    desc: 'Importe ou atualize o cadastro de produtos. Produtos existentes (mesmo SKU) serão atualizados.',
    columns: ['sku *', 'name *', 'category', 'unit', 'unit_cost', 'min_stock', 'max_stock', 'reorder_point', 'safety_stock', 'lead_time_days'],
    example: [
      ['SKU-001', 'Parafuso M8', 'Fixadores', 'UN', '0.50', '100', '500', '200', '150', '5'],
      ['SKU-002', 'Óleo Lubrificante', 'MRO', 'L', '12.00', '50', '200', '80', '60', '7'],
    ],
  },
  {
    key: 'demand',
    label: 'Histórico de Demanda',
    desc: 'Importe séries históricas de demanda. Use uma linha por produto/período.',
    columns: ['sku *', 'date * (YYYY-MM-DD)', 'quantity *'],
    example: [
      ['SKU-001', '2024-01-01', '350'],
      ['SKU-001', '2024-02-01', '420'],
      ['SKU-002', '2024-01-01', '90'],
    ],
  },
  {
    key: 'inventory',
    label: 'Posição de Estoque',
    desc: 'Importe saldos de estoque por produto e data.',
    columns: ['sku *', 'date * (YYYY-MM-DD)', 'quantity_on_hand *', 'quantity_reserved'],
    example: [
      ['SKU-001', '2024-05-01', '280', '30'],
      ['SKU-002', '2024-05-01', '45', '0'],
    ],
  },
]

interface Result {
  created?: number
  updated?: number
  errors?: number
}

export default function DataImport() {
  const [selected, setSelected] = useState<ImportType>(IMPORT_TYPES[0])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [showExample, setShowExample] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const allowed = ['.csv', '.xlsx', '.xls']
    const ext = file.name.slice(file.name.lastIndexOf('.'))
    if (!allowed.includes(ext.toLowerCase())) {
      toast.error('Formato inválido. Use CSV ou Excel (.xlsx, .xls)')
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const fn = importAPI[selected.key]
      const res = await fn(file)
      setResult(res.data)
      toast.success(`Importação concluída: ${res.data.created ?? 0} criados, ${res.data.updated ?? 0} atualizados`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erro na importação')
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplate() {
    const header = selected.columns.map(c => c.replace(' *', '').replace(' (YYYY-MM-DD)', '')).join(',')
    const rows = selected.example.map(r => r.join(',')).join('\n')
    const csv = `${header}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template_${selected.key}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Upload size={20} style={{ color: EPR_AZUL }} />
          Importação de Dados
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Importe dados via CSV ou Excel para empresas sem banco de dados estruturado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Type selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tipo de importação</p>
          {IMPORT_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => { setSelected(t); setResult(null) }}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                selected.key === t.key
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className={`text-sm font-semibold ${selected.key === t.key ? 'text-blue-800' : 'text-gray-800'}`}>
                {t.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Upload area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
            {uploading ? (
              <p className="text-sm font-medium text-blue-700 animate-pulse">Processando arquivo…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Arraste o arquivo aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">CSV, XLSX ou XLS — máx. 10 MB</p>
              </>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 border flex items-start gap-3 ${(result.errors ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              {(result.errors ?? 0) > 0 ? (
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800">Importação concluída</p>
                <div className="flex gap-4 mt-1 text-xs">
                  {result.created !== undefined && (
                    <span className="text-green-700 font-medium">✓ {result.created} criados</span>
                  )}
                  {result.updated !== undefined && result.updated > 0 && (
                    <span className="text-blue-700 font-medium">↻ {result.updated} atualizados</span>
                  )}
                  {(result.errors ?? 0) > 0 && (
                    <span className="text-amber-700 font-medium">⚠ {result.errors} erros (verifique o formato)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Template + columns */}
          <div className="card">
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setShowExample(!showExample)}
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-gray-400" />
                Colunas esperadas e exemplo
              </span>
              {showExample ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>

            {showExample && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Colunas com * são obrigatórias.</p>
                  <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5">
                    <Download size={12} /> Baixar template CSV
                  </button>
                </div>
                <div className="overflow-auto rounded-lg border border-gray-200">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {selected.columns.map(c => (
                          <th key={c} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">
                            {c.includes('*') ? (
                              <><span className="text-red-500">*</span>{c.replace(' *', '').replace(' (YYYY-MM-DD)', '')}</>
                            ) : c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selected.example.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-gray-600">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-2">Dicas de importação</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Datas devem estar no formato <code className="bg-blue-100 px-1 rounded">YYYY-MM-DD</code> (ex: 2024-01-15)</li>
              <li>Números decimais usam ponto (<code className="bg-blue-100 px-1 rounded">.</code>) como separador</li>
              <li>Na importação de Demanda, use um SKU por linha e uma linha por período</li>
              <li>Produtos existentes são atualizados — o SKU é a chave de correspondência</li>
              <li>Arquivos CSV devem usar vírgula como separador de colunas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
