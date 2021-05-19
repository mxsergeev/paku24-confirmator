const {
  makeIcons,
  makeColor,
  makeGoogleEventObject,
} = require('../calendar/helpers')

function createEvent(req, res, next) {
  const { entry, order, fees } = req.body
  const icons = makeIcons(order, fees)
  const color = makeColor(order)

  const eventInfo = {
    title: icons + entry,
    dateTime: order.dateTime,
    duration: order.duration,
    color,
  }

  req.event = makeGoogleEventObject(eventInfo)

  return next()
}

module.exports = { createEvent }
