const calendarRouter = require('express').Router()
const {
  authenticateAccessToken,
} = require('../utils/middleware/authentication')
const addEventToCalendar = require('../utils/calendar/calendarAPI')
const { createEvent } = require('../utils/middleware/calendar')

calendarRouter.use(authenticateAccessToken)

calendarRouter.post('/', createEvent, (req, res) => {
  const { event } = req

  addEventToCalendar(event)
    .then((ev) =>
      res.status(200).send({
        message: 'Event added to calendar.',
        createdEvent: ev.data.summary,
      })
    )
    .catch((err) => next(err))
})

module.exports = calendarRouter
