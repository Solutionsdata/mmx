import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: object) => api.post('/auth/register', data),
}

export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  updateUser: (id: number, data: object) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  resetPassword: (id: number, password: string) => api.post(`/admin/users/${id}/reset-password`, { password }),
}

export const productsAPI = {
  list: () => api.get('/products/'),
  create: (data: object) => api.post('/products/', data),
  update: (id: number, data: object) => api.patch(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  listSuppliers: () => api.get('/products/suppliers'),
  createSupplier: (data: object) => api.post('/products/suppliers', data),
  deleteSupplier: (id: number) => api.delete(`/products/suppliers/${id}`),
}

export const inventoryAPI = {
  listLevels: (productId?: number) => api.get('/inventory/levels', { params: { product_id: productId } }),
  upsertLevel: (data: object) => api.post('/inventory/levels', data),
  listTransactions: (productId?: number) => api.get('/inventory/transactions', { params: { product_id: productId } }),
  createTransaction: (data: object) => api.post('/inventory/transactions', data),
  listDemand: (productId?: number) => api.get('/inventory/demand', { params: { product_id: productId } }),
  createDemand: (data: object) => api.post('/inventory/demand', data),
  deleteDemand: (id: number) => api.delete(`/inventory/demand/${id}`),
}

export const forecastAPI = {
  run: (data: object) => api.post('/forecast/run', data),
  saved: (productId?: number) => api.get('/forecast/saved', { params: { product_id: productId } }),
}

export const ordersAPI = {
  list: (params?: object) => api.get('/orders/', { params }),
  create: (data: object) => api.post('/orders/', data),
  update: (id: number, data: object) => api.patch(`/orders/${id}`, data),
  delete: (id: number) => api.delete(`/orders/${id}`),
}

export const kpisAPI = {
  summary: (productId?: number) => api.get('/kpis/summary', { params: { product_id: productId } }),
  inventoryStatus: () => api.get('/kpis/inventory-status'),
}

export const importAPI = {
  products: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/import/products', fd)
  },
  demand: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/import/demand', fd)
  },
  inventory: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/import/inventory', fd)
  },
}

export default api
