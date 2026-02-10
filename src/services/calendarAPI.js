import interceptor from './interceptor'

const baseUrl = '/api/calendar'

/**
 * @param {Object} params
 * @param {string} params.entry
 * @param {Object} params.order
 * @param {Array} params.fees
 */

export default async function addEventToCalendar(params) {
  const response = await interceptor.axiosInstance.post(baseUrl, params)
  return response.data
}
