import axiosInstance from './interceptor'

const baseUrl = '/api/login'

async function loginWithCredentials(credentials) {
  return axiosInstance.post(baseUrl, credentials).then((res) => res.data)
}

async function loginWithAccessToken() {
  const response = await axiosInstance.post(`${baseUrl}/token`)
  return response.data
}

export default { loginWithCredentials, loginWithAccessToken }
