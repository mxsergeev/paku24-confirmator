const calendarRouter = require('express').Router()

const authMW = require('../authentication/auth.middleware')

const { addEventToCalendar, deleteEventFromCalendar } = require('./calendar.googleAPI')

const { makeGoogleEventObjects } = require('./calendar.helpers')

calendarRouter.use(authMW.authenticateAccessToken)

calendarRouter.post('/', async (req, res, next) => {
  const events = makeGoogleEventObjects(req.body.order, req.body.calendarEntries)

  try {
    await Promise.allSettled(events.map((ev) => addEventToCalendar(ev)))

    return res.status(200).send({
      message: events.length > 1 ? 'Events added to calendar.' : 'Event added to calendar.',
      createdEvent: events.map((ev) => ev.summary).join('\n'),
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
