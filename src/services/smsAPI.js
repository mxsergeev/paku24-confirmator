import interceptor from './interceptor'

const baseUrl = '/api/sms'
/**
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.msg
 */

export default async function sendSMS(params) {
  const response = await interceptor.axiosInstance.post(baseUrl, params)
  return response.data
}

export async function sendCancellationSMS(params) {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/cancellation`, params)
  return response.data
}
