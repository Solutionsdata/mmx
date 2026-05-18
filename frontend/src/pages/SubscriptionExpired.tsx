import { useAuth } from '../context/AuthContext'
import { AlertTriangle, LogOut } from 'lucide-react'

export default function SubscriptionExpired() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Assinatura Vencida</h2>
        <p className="text-gray-500 text-sm mb-6">
          Seu acesso ao MMX expirou. Entre em contato com o administrador para renovar.
        </p>
        <button onClick={logout} className="btn-danger inline-flex items-center gap-2 mx-auto">
          <LogOut size={15} /> Sair
        </button>
      </div>
    </div>
  )
}
