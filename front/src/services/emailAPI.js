import interceptor from './interceptor'

const baseUrl = '/api/email'
/**
 * @param {Object} params
 * @param {string} params.orderDetails
 * @param {Object} params.order
 */

export default async function sendConfirmationEmail(params) {
  const response = await interceptor.axiosInstance.post(
    `${baseUrl}/send-confirmation`,
    params
  )
  return response.data
}
