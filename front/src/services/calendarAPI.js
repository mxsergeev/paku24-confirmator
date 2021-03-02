import axiosInstance from './interceptor'

const baseUrl = '/api/calendar'

export default async function addEventToCalendar(entry, order, options) {
  try {
    const response = await axiosInstance.post(baseUrl, {
      entry,
      order,
      options,
    })
    return response.data
  } catch (err) {
    console.log(err.response?.data || err)
    return err
  }
}
