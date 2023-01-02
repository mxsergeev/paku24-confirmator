/* eslint-disable quote-props */
const fs = require('fs').promises
const path = require('path')
const process = require('process')
const { authenticate } = require('@google-cloud/local-auth')
const { google } = require('googleapis')
const logger = require('../../utils/logger')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar']

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = path.join(process.cwd(), '/modules/calendar/calendar.google.token.json')
const CREDENTIALS_PATH = path.join(
  process.cwd(),
  '/modules/calendar/calendar.google.credentials.json'
)

/**
 * Reads previously authorized token from the saved file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedTokenIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH)
    const credentials = JSON.parse(content)
    return google.auth.fromJSON(credentials)
  } catch (err) {
    return null
  }
}

/**
 * Serializes token to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveToken(client) {
  const content = await fs.readFile(CREDENTIALS_PATH)
  const keys = JSON.parse(content)
  const key = keys.installed || keys.web
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  })
  await fs.writeFile(TOKEN_PATH, payload)
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedTokenIfExist()
  if (client) {
    return client
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  })
  if (client.credentials) {
    await saveToken(client)
  }
  return client
}

/**
 * Adds event to the Google calendar. Before that checks OAuth credentials. Mostly boilerplate from Google Docs example.
 * @param {Object} event
 * @param {string} event.summary
 * @param {string} event.colorId
 * @param {object} event.start
 * @param {string} event.start.dateTime - ISOString
 * @param {string} event.start.timeZone
 * @param {object} event.end
 * @param {string} event.end.dateTime - ISOString
 * @param {string} event.end.timeZone
 * @param {object} event.reminders
 * @param {boolean} event.reminders.useDefault
 */

function addEventToCalendar(event) {
  return new Promise((resolve, reject) => {
    function addEvent(auth) {
      const calendar = google.calendar({ version: 'v3', auth })
      calendar.events.insert(
        {
          auth,
          calendarId: 'primary',
          resource: event,
        },
        (err, ev) => {
          if (err) {
            logger.info(`There was an error contacting the Calendar service: ${err}`)
            return reject(err)
          }
          logger.info(
            `Event created: ${ev.data?.start.dateTime} - ${ev.data?.end.dateTime}\n${ev.data?.summary}`
          )
          resolve(ev)
        }
      )
    }

    authorize().then(addEvent)
  })
}

function deleteEventFromCalendar(eventId) {
  return new Promise((resolve, reject) => {
    function deleteEvent(auth) {
      const calendar = google.calendar({ version: 'v3', auth })
      calendar.events.delete(
        {
          auth,
          calendarId: 'primary',
          eventId,
        },
        (err) => {
          if (err) {
            logger.info(`There was an error contacting the Calendar service: ${err}`)
            return reject(err)
          }
          logger.info(`Event with id ${eventId} deleted.`)
          resolve()
        }
      )
    }

    authorize().then(deleteEvent)
  })
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
//         const start = event.start.dateTime || event.start.date
//         console.log(`${start} - ${event.summary}`)
//       })
//     } else {
//       console.log('No upcoming events found.')
//     }
//   })
// }

module.exports = { addEventToCalendar, deleteEventFromCalendar }
