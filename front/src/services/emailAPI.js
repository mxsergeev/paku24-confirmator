import interceptor from './interceptor'

const baseUrl = '/api/email'
/**
 * @param {Object} params
 * @param {string} params.orderDetails
 * @param {Object} params.options
 * @param {string} params.options.distance
 * @param {Boolean} params.options.hsy
 * @param {Boolean} params.options.XL
 * @param {string} params.email
 */

export default async function sendConfirmationEmail(params) {
  const response = await interceptor.axiosInstance.post(
    `${baseUrl}/send-confirmation`,
    params
  )
  return response.data
}
