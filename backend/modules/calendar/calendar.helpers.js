import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'
import path from 'path'
import { promises as fs } from 'fs'
import { formatAddressLocation } from '../../../src/shared/render/text.js'
import {
  HELSINKI_TIMEZONE,
  calendarDateToUtc,
  isDateOnly,
  parseCalendarDate,
  parseInstant,
} from '../../../src/shared/date-fns-tz.js'
import { makeCalendarEntries } from '../../../src/shared/render/googleCalendar.js'
import dayjs from '../../../src/shared/dayjs.js'

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

function nextCalendarDate(value, fieldName) {
  const date = calendarDateToUtc(value, fieldName)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatCalendarLocation(address) {
  if (typeof address === 'string') return address
  return formatAddressLocation(address)
}

/**
 * Creates move, boxes delivery and pickup event objects for Google Calendar API.
 * @param {Object} eventInfo
 * @param {string} eventInfo.title
 * @param {Date} eventInfo.date
 * @param {string} eventInfo.duration
 * @param {string} eventInfo.color
 */

function makeGoogleEventObjects(order) {
  const hours = Math.floor(Number(order.duration))
  let minutes = (Number(order.duration) % 1) * 60
  if (!minutes) minutes = 0

  const color = makeColor(order)

  const entries = makeCalendarEntries(order)

  const events = [
    {
      role: 'main',
      summary: entries.move.title,
      description: entries.move.description,
      colorId: color,
      location: [formatCalendarLocation(order.address)]
        .concat((order.extraAddresses || []).map((ea) => formatCalendarLocation(ea)))
        .concat([formatCalendarLocation(order.destination)])
        .join('\n'),
      start: {
        dateTime: typeof order.date === 'string' ? order.date : order.date.toISOString(),
        timeZone: HELSINKI_TIMEZONE,
      },
      end: {
        dateTime: dayjs(order.date).add(hours, 'hour').add(minutes, 'minute').toISOString(),
        timeZone: HELSINKI_TIMEZONE,
      },
      reminders: {
        useDefault: false,
      },
    },
  ]

  if (order.boxes && order.boxes.amount > 0) {
    ;['deliveryDate', 'returnDate'].forEach((f) => {
      const dateStr = order.boxes[f]
      const fieldName = f === 'deliveryDate' ? 'box delivery date' : 'box return date'
      const dateOnly = isDateOnly(dateStr)
      if (dateOnly) parseCalendarDate(dateStr, fieldName)
      const parsedDate = dateOnly ? null : parseInstant(dateStr, fieldName)
      const dateTime = parsedDate?.toISOString()

      let location = ''

      if (f === 'deliveryDate') location = formatCalendarLocation(order.address)

      if (f === 'returnDate') location = formatCalendarLocation(order.destination)

      events.push({
        role: f === 'deliveryDate' ? 'boxDelivery' : 'boxReturn',
        summary: entries[f].title,
        description: entries[f].description,
        colorId: '1',
        location,
        start: !dateOnly
          ? {
              dateTime,
              timeZone: HELSINKI_TIMEZONE,
            }
          : {
              date: dateStr,
            },
        end: !dateOnly
          ? {
              dateTime: dayjs(parsedDate).add(1, 'hour').toISOString(),
              timeZone: HELSINKI_TIMEZONE,
            }
          : {
              date: nextCalendarDate(dateStr, `${fieldName} end`),
          },
        reminders: {
          useDefault: false,
        },
      })
    })
  }

  return events
}

export { authorize, getCalendar, makeGoogleEventObjects }
