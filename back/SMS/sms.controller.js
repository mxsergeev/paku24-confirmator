const smsRouter = require('express').Router()
const axios = require('axios')
const { SEMYSMS_API_TOKEN } = require('../utils/config')
const termsData = require('../Email/email.data.terms.json')
const logger = require('../utils/logger')
const authMW = require('../Authentication/auth.middleware')

smsRouter.use(authMW.authenticateAccessToken)

const deviceId = 268248

// function getOutboxSMS() {
//   const urlOutbox = 'https://semysms.net/api/3/outbox_sms.php'
//   return axios
//     .get(urlOutbox, {
//       params: {
//         token: SEMYSMS_API_TOKEN,
//         device: deviceId,
//       },
//     })
//     .then((res) => {
//       if (res.data.error) throw new Error(res.data.error)
//       console.log(res.data)
//     })
// }
// function getSMS(date_start, box) {
//   const urlReceive = 'https://semysms.net/api/3/inbox_sms.php'
//   return axios
//     .get(urlReceive, {
//       params: {
//         token: SEMYSMS_API_TOKEN,
//         device: deviceId,
//         date_start,
//       },
//     })
//     .then((res) => {
//       if (res.data.error) throw new Error(res.data.error)
//       return res.data
//     })
// }

function sendSMSWithGateway(phone, msg) {
  const urlSend = 'https://semysms.net/api/3/sms.php'
  return axios
    .get(urlSend, {
      params: {
        token: SEMYSMS_API_TOKEN,
        device: deviceId,
        phone,
        msg,
      },
    })
    .then((res) => {
      if (res.data.error) throw new Error(res.data.error)
      return res.data
    })
}

smsRouter.post('/', (req, res, next) => {
  const { phone, msg: body } = req.body
  const msg = `VARAUSVAHVISTUS\n${body}\nKIITOS VARAUKSESTANNE!\n\n${termsData.agreesToTerms}`

  return sendSMSWithGateway(phone, msg)
    .then((data) => {
      logger.info(
        `SMS to phonenumber ${phone} sent with status code: ${data.code}`
      )
      return res.status(200).send({ message: 'SMS sent successfully.' })
    })
    .catch((err) => next(err))
})

module.exports = smsRouter
