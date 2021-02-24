import axios from 'axios'
import tokenService from './tokens'

const baseUrl = '/api/login'

async function loginWithCredentials(credentials) {
  return axios.post(baseUrl, credentials).then((res) => res.data)
}

async function loginWithAccessToken() {
  const response = await axios.post(`${baseUrl}/token`)
  return response.data
}

async function loginWithTokens() {
  try {
    return await loginWithAccessToken()
  } catch (err) {
    if (err.response.data.error === 'access token expired') {
      await tokenService.refreshTokens()
      return loginWithAccessToken()
    }
    throw err
  }
}

export default { loginWithCredentials, loginWithTokens }
