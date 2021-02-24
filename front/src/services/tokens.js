import axios from 'axios'

const baseUrl = '/api/token'

async function refreshTokens() {
  await axios.post(baseUrl)
  await axios.post(`${baseUrl}/is-new`)
}

export default { refreshTokens }
