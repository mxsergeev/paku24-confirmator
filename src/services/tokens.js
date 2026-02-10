/* eslint-disable consistent-return */
// eslint-disable-next-line import/no-cycle
import interceptor from './interceptor'

const baseUrl = '/api/token'

async function refreshTokens() {
  await interceptor.axiosInstance.post(baseUrl)
  await interceptor.axiosInstance.post(`${baseUrl}/is-new`)
}

const tokenService = { refreshTokens }

export default tokenService
