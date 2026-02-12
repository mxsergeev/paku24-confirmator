const logger = require('../../utils/logger')
const { getCalendar } = require('./calendar.helpers')

const env = process.env.NODE_ENV || 'production'

/**
 * Adds event to the Google calendar. Before that checks OAuth credentials. Mostly boilerplate from Google Docs example.
 * @param {Object} event
 * @param {string} event.summary
 * @param {string} event.colorId
 * @param {object} event.start
 * @param {string} event.start.date - ISOString
 * @param {string} event.start.timeZone
 * @param {object} event.end
 * @param {string} event.end.date - ISOString
 * @param {string} event.end.timeZone
 * @param {object} event.reminders
 * @param {boolean} event.reminders.useDefault
 */

async function addEventToCalendar(event) {
  if (env === 'test') {
    const fakeId = `test-${Math.random().toString(36).slice(2, 9)}`
    const ev = {
      data: {
        id: fakeId,
        summary: event.summary,
        start: event.start,
        end: event.end,
      },
    }
    logger.info(`(test) Event created: ${ev.data.summary}`)
    return ev
  }

  const calendar = await getCalendar()

  try {
    const ev = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    })

    logger.info(`Event created: ${ev.data?.start.date} - ${ev.data?.end.date}\n${ev.data?.summary}`)
    return ev
  } catch (err) {
    logger.error(err)
    throw err
  }
}

async function deleteEventFromCalendar(eventId) {
  if (env === 'test') {
    logger.info(`(test) Pretend deleted event ${eventId}`)
    return
  }

  const calendar = await getCalendar()

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })

    logger.info(`Event with id ${eventId} deleted.`)
  } catch (err) {
    logger.info(`There was an error contacting the Calendar service: ${err}`)
    return err
  }
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
// function listEvents(auth) {
//   const calendar = google.calendar({ version: 'v3', auth })
//   calendar.events.list({
//     calendarId: 'primary',
//     timeMin: (new Date()).toISOString(),
//     maxResults: 10,
//     singleEvents: true,
//     orderBy: 'startTime',
//   }, (err, res) => {
//     if (err) return console.log(`The API returned an error: ${err}`)
//     const events = res.data.items
//     if (events.length) {
//       console.log('Upcoming 10 events:')
//       events.map((event, i) => {
//         const start = event.start.date || event.start.date
//         console.log(`${start} - ${event.summary}`)
//       })
//     } else {
//       console.log('No upcoming events found.')
//     }
//   })
// }

module.exports = { addEventToCalendar, deleteEventFromCalendar }
