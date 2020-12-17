const calendarRouter = require('express').Router()
const addEventToCalendar = require('../utils/calendar/calendarAPI')
const iconsData = require('../utils/data/icons.json')
const colors = require('../utils/data/colors.json')

function makeIcons(order, options) {
  const distanceIcon = iconsData.misc[options.distance] || ''
  const feeIcons = order
    .fees
    .array
    .map((fee) => {
      if (fee === 'LASKULISÄ') return ''

      return iconsData.fees[fee]
    })
    .reduce((acc, cur) => acc + cur, '')
  const serviceIcons = iconsData.service[order.serviceName]
  const paymentIcons = iconsData.payment[order.paymentType]

  return `${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}${order.time}(${order.duration}h)`
}

function makeColor(order, options) {
  if (options.car) return colors[options.car]
  return colors[order.serviceName]
}

calendarRouter.post('/', (req, res, next) => {
  const { entry, order, options } = req.body
  const icons = makeIcons(order, options)

  const event = {
    title: icons + entry,
    date: order.date.original,
    color: makeColor(order, options),
  }

  console.log('event:', event)

  try {
    addEventToCalendar(event)
    res.status(200).send('Event added to calendar.')
  } catch (err) {
    next(err)
  }
})

module.exports = calendarRouter
