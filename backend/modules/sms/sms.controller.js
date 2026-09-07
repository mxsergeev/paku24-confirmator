import express from 'express'

const smsRouter = express.Router()

import * as logger from '../../utils/logger.js'
import * as authMW from '../authentication/auth.middleware.js'
import { constructMessage, constructCancellationMessage, sendSmsInChunks } from './sms.helpers.js'
import { getOrderById } from '../orderPool/orderPool.service.js'

smsRouter.use(authMW.authenticateAccessToken)

smsRouter.post('/', async (req, res, next) => {
  try {
    const { orderId } = req.body || {}
    if (typeof orderId !== 'string' || !orderId) {
      return res.status(400).send({ error: 'Order ID is required.' })
    }

    const order = await getOrderById(orderId)
    if (order.deletedAt) {
      return res.status(400).send({ error: 'Deleted orders cannot send messages.' })
    }
    if (!order.phone) {
      return res.status(400).send({ error: 'Phone number is required.' })
    }

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

smsRouter.post('/cancellation', async (req, res, next) => {
  try {
    const { orderId } = req.body || {}
    if (typeof orderId !== 'string' || !orderId) {
      return res.status(400).send({ error: 'Order ID is required.' })
    }

    const order = await getOrderById(orderId)
    if (order.deletedAt) {
      return res.status(400).send({ error: 'Deleted orders cannot send messages.' })
    }
    if (!order.phone) {
      return res.status(400).send({ error: 'Phone number is required.' })
    }

    const { chunkCount, totalSegments } = await sendSmsInChunks(
      order.phone,
      constructCancellationMessage(order)
    )

    logger.info(
      `Cancellation SMS to phonenumber ${order.phone} sent in ${chunkCount} chunk(s) (${totalSegments} segments total)`
    )
    return res.status(200).send({
      message: `Cancellation SMS to phonenumber ${order.phone} added to the queue in ${chunkCount} chunk(s). Don't forget to start the SMS Gateway.`,
    })
  } catch (err) {
    next(err)
  }
})

export default smsRouter
