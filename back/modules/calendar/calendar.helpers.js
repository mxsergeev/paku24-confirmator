const dayjs = require('dayjs')
const colors = require('./calendar.data.colors.json')

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
 * Creates move, boxes delivery and pickup event objects for Google Calendar API.
 * @param {Object} eventInfo
 * @param {string} eventInfo.title
 * @param {Date} eventInfo.date
 * @param {string} eventInfo.duration
 * @param {string} eventInfo.color
 */

function makeGoogleEventObjects(order, entries) {
  const hours = Math.floor(Number(order.duration))
  let minutes = (Number(order.duration) % 1) * 60
  if (!minutes) minutes = 0

  const color = makeColor(order)

  const timeZone = 'Europe/Helsinki'

  const events = [
    {
      summary: entries.move.title,
      description: entries.move.description,
      colorId: color,
      start: {
        dateTime: order.dateTime,
        timeZone,
      },
      end: {
        dateTime: dayjs(order.dateTime).add(hours, 'hour').add(minutes, 'minute').toISOString(),
        timeZone,
      },
      reminders: {
        useDefault: false,
      },
    },
  ]

  if (order.boxesAmount > 0) {
    ;['boxesDelivery', 'boxesPickup'].forEach((f) => {
      const dateStr = order[`${f}Date`]

      events.push({
        summary: entries[f].title,
        description: entries[f].description,
        colorId: colors.boxes,
        start: dateStr.includes('T')
          ? {
              dateTime: dateStr,
              timeZone,
            }
          : {
              date: dateStr,
              timeZone,
            },
        end: dateStr.includes('T')
          ? {
              dateTime: dayjs(dateStr).add(1, 'hour').toISOString(),
              timeZone,
            }
          : {
              date: dateStr,
              timeZone,
            },
        reminders: {
          useDefault: false,
        },
      })
    })
  }

  return events
}

module.exports = {
  makeGoogleEventObjects,
}
