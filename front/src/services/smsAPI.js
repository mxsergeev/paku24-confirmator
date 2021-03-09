import axiosInstance from './interceptor'

const baseUrl = '/api/sms'
/**
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.msg
 */

export default async function sendSMS(params) {
  const response = await axiosInstance.post(baseUrl, params)
  return response.data
}
