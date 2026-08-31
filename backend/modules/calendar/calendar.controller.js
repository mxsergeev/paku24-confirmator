import express from 'express'

const calendarRouter = express.Router()

import * as authMW from '../authentication/auth.middleware.js'

import { deleteEventFromCalendar } from './calendar.googleAPI.js'
import { syncOrderToCalendar } from './calendar.sync.js'
import OrderModel from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import { orderTime } from '../../../src/shared/orderPricing.js'

calendarRouter.use(authMW.authenticateAccessToken)

calendarRouter.post('/', async (req, res, next) => {
  try {
    const orderId = req.body?.orderId
    if (!orderId) {
      throw newErrorWithCustomName('ValidationError', 'orderId is required')
    }

    // Persisted orders are authoritative: the request payload is a rendered
    // view and must not replace stored role IDs or booking data.
    const order = await OrderModel.findById(orderId)
    if (!order) throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')

    const result = await syncOrderToCalendar(order)
    const eventCount = Object.keys(result?.events || {}).length

    const createdEvent = `🚛🚛💳${orderTime(order)}(${order.duration}h)${req.body.entry || ''}`

    return res.status(200).send({
      message: eventCount > 1 ? 'Events added to calendar.' : 'Event added to calendar.',
      createdEvent,
      eventId: result?.calendarEventIds?.main || null,
      calendarEventIds: result?.calendarEventIds || null,
    })
  } catch (err) {
    return next(err)
  }
})

calendarRouter.delete('/:eventId', (req, res, next) => {
  const { eventId } = req.params
  deleteEventFromCalendar(eventId)
    .then(() => {
      res.status(204).end()
    })
    .catch((err) => next(err))
})

export default calendarRouter
