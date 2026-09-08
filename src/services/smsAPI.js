import interceptor from './interceptor'

const baseUrl = '/api/sms'
/**
 * @param {Object} params
 * @param {string} params.orderId Persisted order ID.
 */

export default async function sendSMS(params) {
  const response = await interceptor.axiosInstance.post(baseUrl, {
    orderId: params?.orderId,
  })
  return response.data
}

export async function sendCancellationSMS(params) {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/cancellation`, {
    orderId: params?.orderId,
  })
  return response.data
}
