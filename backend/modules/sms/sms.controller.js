import express from 'express'

const smsRouter = express.Router()

import * as logger from '../../utils/logger.js'
import * as authMW from '../authentication/auth.middleware.js'
import { constructMessage, sendSmsInChunks } from './sms.helpers.js'

smsRouter.use(authMW.authenticateAccessToken)

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

export default smsRouter
