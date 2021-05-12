const { makeTitle, makeColor, makeEventObject } = require('../calendar/helpers')

function createEvent(req, res, next) {
  const { entry, order, options } = req.body
  const icons = makeTitle(order, options)
  const color = makeColor(order, options)

  const eventInfo = {
    title: icons + entry,
    date: order.date.original,
    duration: order.duration,
    color,
  }

  req.event = makeEventObject(eventInfo)

  return next()
}

module.exports = { createEvent }
