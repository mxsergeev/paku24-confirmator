import interceptor from './interceptor'

const baseUrl = '/api/order-pool'

async function get() {
  return interceptor.axiosInstance.get(baseUrl).then((res) => res?.data)
}

async function getDeleted() {
  return interceptor.axiosInstance.get(`${baseUrl}/deleted`).then((res) => res?.data)
}

async function confirm(id) {
  return interceptor.axiosInstance
    .put(`${baseUrl}/confirm/${id}`)
    .then((res) => res?.data)
  // .catch((err) => console.log(err))
}

async function remove(id) {
  const response = await interceptor.axiosInstance.delete(`${baseUrl}/delete/${id}`)
  return response?.data
}

async function retrieve(id) {
  const response = await interceptor.axiosInstance.put(`${baseUrl}/retrieve/${id}`)
  return response?.data
}

export default { get, getDeleted, confirm, remove, retrieve }
