const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone') // dependent on utc plugin
const iconsData = require('../data/icons.json')
const colors = require('../data/colors.json')

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Creates the title with icons, starting time and duration for an event
 * @param {object} order
 * @param {boolean} order.XL
 * @param {string} order.distance
 * @param {object} order
 * @param {object} order.fees
 * @param {string[]} order.fees.array
 * @param {string} order.serviceName
 * @param {string} order.paymentType
 */

function makeIcons(order, fees) {
  // Making so that the time is in the right timezone.
  // Potentially easier fix is to send the time string directly from client.
  const time = dayjs(new Date(order.dateTime).toUTCString())
    .local()
    .tz('Europe/Helsinki')
    .format('HH:mm')
  const sizeIcon = order.XL ? iconsData.size.XL : ''
  const distanceIcon = iconsData.misc[order.distance] || ''
  const feeIcons = fees
    .map((fee) => {
      if (fee.name === 'Laskulisä') return ''

      return iconsData.fees[fee.name]
    })
    .reduce((acc, cur) => acc + cur, '')
  const serviceIcons = iconsData.service[order.serviceName]
  const paymentIcons = iconsData.payment[order.paymentType]

  return `${sizeIcon}${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}${time}(${order.duration}h)`
}

/**
 * Decides which color the event will be depending on car and service name
 * @param {object} order
 * @param {boolean} order.altColorPalette
 * @param {object} order
 * @param {string} order.serviceName
 */

function makeColor(order) {
  if (order.altColorPalette) return colors.altColorPalette[order.serviceName]
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

function makeGoogleEventObject({ title, dateTime, duration, color }) {
  const date = new Date(dateTime)

  const hours = Math.floor(Number(duration))
  let minutes = (Number(duration) % 1) * 60
  if (!minutes) minutes = 0

  const endDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours() + hours,
    date.getMinutes() + minutes
  )

  const event = {
    summary: title,
    colorId: color,
    start: {
      dateTime: date.toISOString(),
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

module.exports = { makeIcons, makeColor, makeGoogleEventObject }
