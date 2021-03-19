const calendarRouter = require('express').Router()
const addEventToCalendar = require('../utils/calendar/calendarAPI')
const iconsData = require('../utils/data/icons.json')
const colors = require('../utils/data/colors.json')
const {
  authenticateAccessToken,
} = require('../utils/middleware/authentication')

calendarRouter.use(authenticateAccessToken)

function makeIcons(order, options) {
  const sizeIcon = options.XL ? iconsData.size.XL : ''
  const distanceIcon = iconsData.misc[options.distance] || ''
  const feeIcons = order.fees.array
    .map((fee) => {
      if (fee === 'LASKULISÄ') return ''

      return iconsData.fees[fee]
    })
    .reduce((acc, cur) => acc + cur, '')
  const serviceIcons = iconsData.service[order.serviceName]
  const paymentIcons = iconsData.payment[order.paymentType]

  return `${sizeIcon}${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}${order.time}(${order.duration}h)`
}

function makeColor(order, options) {
  if (options.secondCar) return colors.secondCar[order.serviceName]
  return colors[order.serviceName]
}

calendarRouter.post('/', (req, res, next) => {
  const { entry, order, options } = req.body
  const icons = makeIcons(order, options)

  const event = {
    title: icons + entry,
    date: order.date.original,
    duration: order.duration,
    color: makeColor(order, options),
  }

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
