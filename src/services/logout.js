import axios from 'axios'

const baseUrl = '/api/logout'

async function logout() {
  return axios.post(baseUrl).then((res) => res.data)
}

export default { logout }
