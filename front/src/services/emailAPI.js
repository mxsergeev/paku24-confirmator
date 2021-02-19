import axios from 'axios'

const baseUrl = '/api/email'

export default function sendConfirmationEmail(confirmation, options, email) {
  return axios
    .post(baseUrl, { confirmation, options, email })
    .then((res) => res.data)
}
