/* eslint-disable camelcase */
const smsRouter = require('express').Router()
const axios = require('axios')
const { SEMYSMS_API_TOKEN } = require('../utils/config')

console.log(SEMYSMS_API_TOKEN)

const deviceId = 268248
function getOutboxSMS() {
  const urlOutbox = 'https://semysms.net/api/3/outbox_sms.php'
  return axios
    .get(urlOutbox, {
      params: {
        token: SEMYSMS_API_TOKEN,
        device: deviceId,
      },
    })
    .then((res) => {
      if (res.data.error) throw new Error(res.data.error)
      console.log(res.data)
    })
}
function getSMS(date_start, box) {
  
  const urlReceive = 'https://semysms.net/api/3/inbox_sms.php'
  return axios
    .get(urlReceive, {
      params: {
        token: SEMYSMS_API_TOKEN,
        device: deviceId,
        date_start,
      },
    })
    .then((res) => {
      if (res.data.error) throw new Error(res.data.error)
      return res.data
    })
}

function sendSMSWithGateway(phone, msg) {
  const urlSend = 'https://semysms.net/api/3/sms.php'
  return axios
    .get(urlSend, {
      params: {
        token: SEMYSMS_API_TOKEN,
        device: deviceId,
        phone: encodeURI(phone),
        msg,
      },
    })
    .then((res) => {
      if (res.data.error) throw new Error(res.data.error)
      return res.data
    })
}

smsRouter.get('/test', (req, response, next) => {

})

smsRouter.post('/', (req, res, next) => {
  const { phone, msg } = req.body

  return sendSMSWithGateway(phone, msg)
    .then((data) => {
      console.log(data)
      return res.status(200).send({ message: 'SMS sent successfully.' })
    })
    .catch((err) => next(err))
})

module.exports = smsRouter
