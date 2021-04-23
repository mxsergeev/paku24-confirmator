import axiosInstance from './interceptor'

const baseUrl = '/api/order-pool'

async function get() {
  const response = await axiosInstance.get(baseUrl)
  return response.data
}

async function getDeleted() {
  const response = await axiosInstance.get(`${baseUrl}/deleted`)
  return response.data
}

async function confirm(id) {
  const response = await axiosInstance.put(`${baseUrl}/confirm/${id}`)
  return response.data
}

async function remove(id) {
  const response = await axiosInstance.put(`${baseUrl}/delete/${id}`)
  return response.data
}

async function retrieve(id) {
  const response = await axiosInstance.put(`${baseUrl}/retrieve/${id}`)
  return response.data
}

export default { get, getDeleted, confirm, remove, retrieve }
