import interceptor from './interceptor'

const baseUrl = '/api/login'

async function loginWithCredentials(credentials) {
  return interceptor.axiosInstance
    .post(baseUrl, credentials)
    .then((res) => res.data)
}

async function loginWithAccessToken() {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/token`)
  return response.data
}

export default { loginWithCredentials, loginWithAccessToken }
