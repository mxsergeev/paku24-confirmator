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

async function findEventByStartAndSummary(startIso, summary) {
  if (env === 'test') return null

  const calendar = await getCalendar()
  try {
    // Search a small window around the start time to find matching events
    const timeMin = new Date(new Date(startIso).getTime() - 2 * 60 * 1000).toISOString()
    const timeMax = new Date(new Date(startIso).getTime() + 2 * 60 * 1000).toISOString()
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      q: summary,
    })
    const items = res.data.items || []
    // Find exact summary match if possible
    const found = items.find((it) => (it.summary || '').trim() === (summary || '').trim())
    return found || null
  } catch (err) {
    logger.error('findEventByStartAndSummary failed', err)
    return null
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

async function updateEventInCalendar(eventId, event) {
  if (env === 'test') {
    const ev = {
      data: {
        id: eventId,
        summary: event.summary,
        start: event.start,
        end: event.end,
      },
    }
    logger.info(`(test) Event updated: ${ev.data.summary}`)
    return ev
  }

  const calendar = await getCalendar()

  try {
    const ev = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: event,
    })

    logger.info(`Event updated: ${ev.data?.id} - ${ev.data?.summary}`)
    return ev
  } catch (err) {
    logger.error(err)
    throw err
  }
}

export {
  addEventToCalendar,
  deleteEventFromCalendar,
  updateEventInCalendar,
  findEventByStartAndSummary,
}
