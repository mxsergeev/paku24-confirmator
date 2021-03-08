import axios from 'axios'
import tokenService from './tokens'

const axiosInstance = axios.create()

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response.data.error === 'access token expired') {
      await tokenService.refreshTokens()
      return axiosInstance(originalRequest)
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
