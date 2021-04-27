import interceptor from './interceptor'

const baseUrl = '/api/order-pool'

async function get() {
  // try {
  //   const response = await interceptor.axiosInstance.get(baseUrl)
  //   return response.data
  // } catch (err) {
  //   return console.log(err)
  // }

  return interceptor.axiosInstance.get(baseUrl).then((res) => res?.data)
}

async function getDeleted() {
  // try {
  //   const response = await interceptor.axiosInstance.get(`${baseUrl}/deleted`)
  //   return response.data
  // } catch (err) {
  //   return console.log(err)
  // }
  return interceptor.axiosInstance
    .get(`${baseUrl}/deleted`)
    .then((res) => res?.data)
  // .catch((err) => console.log(err))
}

async function confirm(id) {
  return interceptor.axiosInstance
    .put(`${baseUrl}/confirm/${id}`)
    .then((res) => res?.data)
  // .catch((err) => console.log(err))
}

async function remove(id) {
  const response = await interceptor.axiosInstance.put(
    `${baseUrl}/delete/${id}`
  )
  return response?.data
}

async function retrieve(id) {
  const response = await interceptor.axiosInstance.put(
    `${baseUrl}/retrieve/${id}`
  )
  return response?.data
}

export default { get, getDeleted, confirm, remove, retrieve }
