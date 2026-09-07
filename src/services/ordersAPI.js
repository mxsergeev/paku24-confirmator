import interceptor from './interceptor'

const baseUrl = '/api/order-pool'
const ordersUrl = `${baseUrl}/v2`

async function getById(id) {
  const response = await interceptor.axiosInstance.get(`${ordersUrl}/${id}`)
  return response.data
}

async function getByRange({ from, to, deleted = false } = {}) {
  const params = new URLSearchParams({ from, to })
  if (deleted !== null && typeof deleted !== 'undefined') {
    params.set('deleted', String(deleted))
  }

  const response = await interceptor.axiosInstance.get(`${ordersUrl}/?${params}`)
  return response.data.orders
}

async function confirm(id) {
  const response = await interceptor.axiosInstance.put(`${ordersUrl}/confirm/${id}`)
  return response.data
}

async function cancel(id) {
  const response = await interceptor.axiosInstance.put(`${ordersUrl}/cancel/${id}`)
  return response.data
}

async function remove(id) {
  const response = await interceptor.axiosInstance.delete(`${baseUrl}/delete/${id}`)
  return response.data
}

async function removePermanently(id) {
  const response = await interceptor.axiosInstance.delete(`${ordersUrl}/delete-permanent/${id}`)
  return response.data
}

async function getConfirmedOrders({ periodFrom, periodTo }) {
  const params = new URLSearchParams({ periodFrom, periodTo })
  const response = await interceptor.axiosInstance.get(
    `${baseUrl}/confirmed-by-user/?${params}`,
  )

  return response.data
}

async function add({ order }) {
  const response = await interceptor.axiosInstance.post(`${ordersUrl}/add`, { order })
  return response.data
}

async function update(id, updateData) {
  const response = await interceptor.axiosInstance.put(`${ordersUrl}/${id}`, { updateData })
  return response.data
}

async function restore(id) {
  const response = await interceptor.axiosInstance.post(`${ordersUrl}/restore/${id}`)
  return response.data
}

const ordersAPI = {
  getById,
  getByRange,
  confirm,
  cancel,
  remove,
  removePermanently,
  getConfirmedOrders,
  add,
  update,
  restore,
}

export default ordersAPI
