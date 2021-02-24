import axios from 'axios'

const baseUrl = '/api/calendar'

export default async function addEventToCalendar(entry, order, options) {
  try {
    const response = await axios.post(baseUrl, { entry, order, options })
    return response.data
  } catch (err) {
    return console.log(err.response?.data || err)
  }
}
