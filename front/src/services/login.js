import axios from 'axios'

function checkPass() {
  const pass = askPass()
  return axios
    .post('/api/login', { pass })
    .then(res => {
      if (res.data.correct === true) storePass(pass)
      return res.data
    })
}

function askPass() {
  return prompt('Enter password:')
}

function storePass(pass) {
  return localStorage.setItem('pass', pass)
}

function getStoredPass() {
  return localStorage.getItem('pass')
}

const loginServiсe = {
  checkPass,
  getStoredPass,
}

export default loginServiсe
