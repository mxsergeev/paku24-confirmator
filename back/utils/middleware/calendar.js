const { makeTitle, makeColor } = require('../calendar/helpers')

function makeEventObject(req, res, next) {
  const { entry, order, options } = req.body
  const icons = makeTitle(order, options)
  const color = makeColor(order, options)

  req.event = {
    title: icons + entry,
    date: order.date.original,
    duration: order.duration,
    color,
  }

  return next()
}

module.exports = { makeEventObject }
