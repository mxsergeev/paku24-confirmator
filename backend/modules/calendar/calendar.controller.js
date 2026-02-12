const calendarRouter = require('express').Router()

const authMW = require('../authentication/auth.middleware')

const { addEventToCalendar, deleteEventFromCalendar } = require('./calendar.googleAPI')

const { makeGoogleEventObjects } = require('./calendar.helpers')

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

module.exports = calendarRouter
