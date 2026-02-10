import interceptor from './interceptor'

const baseUrl = '/api/calendar'

/**
 * @param {Object} params
 * @param {Object} params.order
 */

export default async function addEventToCalendar(params) {
  const response = await interceptor.axiosInstance.post(baseUrl, params)
  return response.data
}
