const calendarRouter = require('express').Router()

const authMW = require('../authentication/auth.middleware')

const {
  addEventToCalendar,
  deleteEventFromCalendar,
} = require('./calendar.googleAPI')

const { composeGoogleEventObject } = require('./calendar.helpers')

calendarRouter.use(authMW.authenticateAccessToken)

calendarRouter.post('/', (req, res, next) => {
  const event = composeGoogleEventObject(
    req.body.entry,
    req.body.order,
    req.body.fees
  )

  addEventToCalendar(event)
    .then((ev) =>
      res.status(200).send({
        message: 'Event added to calendar.',
        createdEvent: ev.data.summary?.split('\n')[0],
        eventId: ev.data.id,
      })
    )
    .catch((err) => next(err))
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
