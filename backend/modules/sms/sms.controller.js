const smsRouter = require('express').Router()
const logger = require('../../utils/logger')
const authMW = require('../authentication/auth.middleware')
const { constructMessage, sendSmsInChunks } = require('./sms.helpers')

smsRouter.use(authMW.authenticateAccessToken)

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

smsRouter.post('/', async (req, res, next) => {
  const { order } = req.body

  try {
    const { chunkCount, totalSegments } = await sendSmsInChunks(
      order.phone,
      constructMessage(order)
    )

    logger.info(
      `SMS to phonenumber ${order.phone} sent in ${chunkCount} chunk(s) (${totalSegments} segments total)`
    )
    return res.status(200).send({
      message: `SMS to phonenumber ${order.phone} added to the queue in ${chunkCount} chunk(s). Don't forget to start the SMS Gateway.`,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = smsRouter
