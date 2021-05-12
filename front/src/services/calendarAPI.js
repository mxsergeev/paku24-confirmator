import interceptor from './interceptor'

const baseUrl = '/api/calendar'

export default async function addEventToCalendar(entry, order, options) {
  const response = await interceptor.axiosInstance.post(baseUrl, {
    entry,
    order,
    options,
  })
  return response.data
}
