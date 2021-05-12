import axios from 'axios'
// eslint-disable-next-line import/no-cycle
import tokenService from './tokens'

const axiosInstance = axios.create()

function setupInterceptor(externalActions) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config
      if (error.response.data.error === 'access token expired') {
        /*
          isError is true if the token service received an http error objected 
          that was returned from this interceptor. 
          In all other scenarios it does not return anything.
          See next if statement.
          (This is badly designed)
        */
        const isError = await tokenService.refreshTokens()
        if (isError) return null
        return axiosInstance(originalRequest)
      }
      if (
        error.response.data.error === 'refresh token expired' ||
        error.response.data.error === 'invalid refresh token' ||
        error.response.data.error === 'token missing'
      ) {
        /* 
          It's important to not throw errors in this block but only return them
          because other services that are based on this instance do not handle refresh token errors
        */
        externalActions.logout()
        return error
      }
      if (error.response.status === 429) {
        setTimeout(() => null, 1500)
      }
      return Promise.reject(error)
    }
  )
}

export default { axiosInstance, setupInterceptor }
