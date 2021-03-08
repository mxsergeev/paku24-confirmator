import axiosInstance from './interceptor'

const baseUrl = '/api/email'
/**
 * @param {Object} params
 * @param {string} params.confirmation
 * @param {Object} params.options
 * @param {string} params.options.distance
 * @param {Boolean} params.options.hsy
 * @param {Boolean} params.options.XL
 * @param {string} params.email
 */

export default async function sendConfirmationEmail(params) {
  const response = await axiosInstance.post(baseUrl, params)
  return response.data
}
