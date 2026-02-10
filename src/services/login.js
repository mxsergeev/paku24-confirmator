import axios from 'axios'

const baseUrl = '/api/login'

// Defining interceptor specific to login service
// Default interceptor notifies about refresh token problems
// We don't need to notify about that when the user opens the app for the first time
// (eg. when trying to login)
const axiosLoginInstance = axios.create()
axiosLoginInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response.data.error === 'access token expired') {
      try {
        await axios.post('/api/token')
        await axios.post('/api/token/is-new')
        return axiosLoginInstance(originalRequest)
      } catch (err) {
        return err
      }
    }

    return Promise.reject(error)
  }
)

async function loginWithCredentials(credentials) {
  return axiosLoginInstance.post(baseUrl, credentials).then((res) => res.data)
}

async function loginWithAccessToken() {
  const response = await axiosLoginInstance.post(`${baseUrl}/token`)
  return response.data
}

export default { loginWithCredentials, loginWithAccessToken }
