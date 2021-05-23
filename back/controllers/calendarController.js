const calendarRouter = require('express').Router()

const {
  authenticateAccessToken,
} = require('../utils/middleware/authentication')

const {
  addEventToCalendar,
  deleteEventFromCalendar,
} = require('../utils/calendar/calendarAPI')

const { createEvent } = require('../utils/middleware/calendar')

calendarRouter.use(authenticateAccessToken)

calendarRouter.post('/', createEvent, (req, res, next) => {
  const { event } = req

  addEventToCalendar(event)
    .then((ev) =>
      res.status(200).send({
        message: 'Event added to calendar.',
        createdEvent: ev.data.summary,
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
