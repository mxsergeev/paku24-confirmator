const iconsData = require('../data/icons.json')
const colors = require('../data/colors.json')

/**
 * Creates the title with icons, starting time and duration for an event
 * @param {object} options
 * @param {boolean} options.XL
 * @param {string} options.distance
 * @param {object} order
 * @param {object} order.fees
 * @param {string[]} order.fees.array
 * @param {string} order.serviceName
 * @param {string} order.paymentType
 */

function makeTitle(order, options) {
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

/**
 * Decides which color the event will be depending on car and service name
 * @param {object} options
 * @param {boolean} options.secondCar
 * @param {object} order
 * @param {string} order.serviceName
 */

function makeColor(order, options) {
  if (options.secondCar) return colors.secondCar[order.serviceName]
  return colors[order.serviceName]
}

/**
 * Creates an event object for Google Calendar API.
 * @param {Object} eventInfo
 * @param {string} eventInfo.title
 * @param {Date} eventInfo.date
 * @param {string} eventInfo.duration
 * @param {string} eventInfo.color
 */

function createEvent({ title, date, duration, color }) {
  const dateRaw = new Date(date)

  const hours = Math.floor(Number(duration))
  let minutes = (Number(duration) % 1) * 60
  if (!minutes) minutes = 0

  const endDate = new Date(
    dateRaw.getFullYear(),
    dateRaw.getMonth(),
    dateRaw.getDate(),
    dateRaw.getHours() + hours,
    dateRaw.getMinutes() + minutes
  )

  const event = {
    summary: title,
    colorId: color,
    start: {
      dateTime: dateRaw.toISOString(),
      timeZone: 'Europe/Helsinki',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Europe/Helsinki',
    },
    reminders: {
      useDefault: false,
    },
  }

  return event
}

module.exports = { makeTitle, makeColor, createEvent }
