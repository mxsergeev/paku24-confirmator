import express from 'express'

const calendarRouter = express.Router()

import * as authMW from '../authentication/auth.middleware.js'

import { addEventToCalendar, deleteEventFromCalendar } from './calendar.googleAPI.js'
import { linkOrderToEvent } from './calendar.sync.js'
import * as logger from '../../utils/logger.js'

import { makeGoogleEventObjects } from './calendar.helpers.js'

calendarRouter.use(authMW.authenticateAccessToken)

calendarRouter.post('/', async (req, res, next) => {
  const events = makeGoogleEventObjects(req.body.order)

  try {
    const results = await Promise.allSettled(events.map((ev) => addEventToCalendar(ev)))

    const order = req.body.order || {}
    const createdEvent = `🚛🚛💳${order.time}(${order.duration}h)${req.body.entry || ''}`

    // pick the first fulfilled result that contains an id
    const fulfilled = results.find(
      (r) => r.status === 'fulfilled' && r.value && r.value.data && r.value.data.id
    )
    const eventId = fulfilled ? fulfilled.value.data.id : null

    // If this request was made for an existing order, delegate persisting googleEventId
    try {
      const orderId = req.body.order?._id || req.body.order?.id
      if (eventId && orderId) {
        await linkOrderToEvent(orderId, eventId)
      }
    } catch (err) {
      // non-fatal: log and continue
      logger.error('Failed to link googleEventId from /api/calendar', err)
    }

    return res.status(200).send({
      message: events.length > 1 ? 'Events added to calendar.' : 'Event added to calendar.',
      createdEvent,
      eventId,
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
