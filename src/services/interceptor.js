/* eslint-disable consistent-return */
import axios from 'axios'
// eslint-disable-next-line import/no-cycle
import tokenService from './tokens'

const axiosInstance = axios.create()

function setupInterceptor(externalActions) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config
      const errorCode = error.response?.data?.error
      if (errorCode === 'access token expired') {
        // if tokenService receives an error, request won't be resent
        await tokenService.refreshTokens()
        return axiosInstance(originalRequest)
      }
      if (
        errorCode === 'access token missing' ||
        errorCode === 'invalid access token' ||
        errorCode === 'refresh token expired' ||
        errorCode === 'invalid refresh token' ||
        errorCode === 'refresh token missing'
      ) {
        externalActions.notificate()
        externalActions.logout()
        throw new Error('logout')
      }
      if (error.response?.status === 429) {
        setTimeout(() => null, 1500)
      }
      return Promise.reject(error)
    }
  )
}

const interceptor = { axiosInstance, setupInterceptor }

export default interceptor
