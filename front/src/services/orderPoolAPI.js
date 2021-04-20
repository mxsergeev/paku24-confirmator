import axiosInstance from './interceptor'

const baseUrl = '/api/order-pool'

async function get() {
  const response = await axiosInstance.get(baseUrl)
  return response.data
}

async function confirm(id) {
  const response = await axiosInstance.put(`${baseUrl}/confirm/${id}`)
  return response.data
}

export default { get, confirm }
