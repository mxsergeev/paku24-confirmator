import * as logger from '../../utils/logger.js'
import { getCalendar } from './calendar.helpers.js'

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

export { addEventToCalendar, deleteEventFromCalendar }
