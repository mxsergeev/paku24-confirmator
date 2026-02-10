const { authenticate } = require('@google-cloud/local-auth')
const { google } = require('googleapis')
const path = require('path')
const fs = require('fs').promises
const dayjs = require('dayjs')
const colors = require('./calendar.data.colors.json')

const env = process.env.NODE_ENV || 'production'

const credsFileName = `${env}.calendar.google.credentials.json`
const tokenFileName = `${env}.calendar.google.token.json`

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar']

const CREDENTIALS_PATH = path.join(process.cwd(), `credentials/${credsFileName}`)
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = path.join(process.cwd(), `credentials/${tokenFileName}`)

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
 * Load or request or authorization to call APIs.
 */
async function authorize() {
  try {
    await fs.readFile(CREDENTIALS_PATH)
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`${credsFileName} missing.`)
    }

    throw err
  }

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

async function getCalendar() {
  const auth = await authorize()
  const calendar = google.calendar({ version: 'v3', auth })

  return calendar
}

/**
 * Decides which color the event will be depending on car and service name
 * @param {object} order
 * @param {boolean} order.altColorPalette
 * @param {object} order
 * @param {string} order.serviceName
 */

function makeColor(order) {
  return order.eventColor
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
      location: [order.address].concat(order.destination?.split('\n')).filter(Boolean).join('\n'),
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

      let location = ''

      if (f === 'boxesDelivery') {
        location = order.address
      }

      if (f === 'boxesPickup') {
        location = order.destination
      }

      events.push({
        summary: entries[f].title,
        description: entries[f].description,
        colorId: colors.boxes,
        location,
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
  authorize,
  getCalendar,
  makeGoogleEventObjects,
}
