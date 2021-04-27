/* eslint-disable consistent-return */
// eslint-disable-next-line import/no-cycle
import interceptor from './interceptor'

const baseUrl = '/api/token'

async function refreshTokens() {
  const result = await interceptor.axiosInstance.post(baseUrl)
  if (result.response?.data.error) {
    // return an error for interceptor to handle it
    return result
  }
  await interceptor.axiosInstance.post(`${baseUrl}/is-new`)
}

export default { refreshTokens }
