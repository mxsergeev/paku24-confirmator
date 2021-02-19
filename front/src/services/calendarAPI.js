import axios from 'axios'

const baseUrl = '/api/calendar'

export default function addEventToCalendar(entry, order, options) {
  return axios.post(baseUrl, { entry, order, options }).then((res) => res.data)
}
