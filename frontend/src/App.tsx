import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Forecasting from './pages/Forecasting'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import DataImport from './pages/DataImport'
import AdminUsers from './pages/AdminUsers'
import SubscriptionExpired from './pages/SubscriptionExpired'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin && user.assinatura_ate && new Date(user.assinatura_ate) < new Date()) {
    return <SubscriptionExpired />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { user, isLoading } = useAuth()
  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="previsao" element={<Forecasting />} />
        <Route path="estoque" element={<Inventory />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="importar" element={<DataImport />} />
        <Route path="admin/usuarios" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { fontSize: '13px', borderRadius: '10px', maxWidth: '380px' },
              success: { iconTheme: { primary: '#1B7C3E', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
