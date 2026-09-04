import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'
import path from 'path'
import { promises as fs } from 'fs'
import icons from '../../../src/data/icons.json' with { type: 'json' }
import { formatAddressLocation, formatMoveCalendarDescription, formatBoxDeliveryCalendarDescription, formatBoxReturnCalendarDescription } from '../../../src/shared/render/text.js'
import { getOrderPricing } from '../../../src/shared/orderPricing.js'
import { resolveEventColorId } from '../../../src/shared/eventColor.js'
import {
  HELSINKI_TIMEZONE,
  calendarDateToUtc,
  formatHelsinkiCalendarDate,
  formatInTimeZone,
  parseInstant,
} from '../../../src/shared/date-fns-tz.js'
import dayjs from '../../../src/shared/dayjs.js'
import { delete as deleteTestEvent, insert as insertTestEvent, update as updateTestEvent } from './testCalendarProvider.js'

const env = process.env.NODE_ENV || 'production'
const credsFileName = `${env}.calendar.google.credentials.json`
const tokenFileName = `${env}.calendar.google.token.json`
const SCOPES = ['https://www.googleapis.com/auth/calendar']
const CREDENTIALS_PATH = path.join(process.cwd(), `credentials/${credsFileName}`)
const TOKEN_PATH = path.join(process.cwd(), `credentials/${tokenFileName}`)
const CANCELED_EVENT_COLOR_ID = '8'
const ROLE_SUFFIX = { main: 'm', boxDelivery: 'd', boxReturn: 'r' }
const ROLES = ['main', 'boxDelivery', 'boxReturn']

async function saveToken(client) {
  const content = await fs.readFile(CREDENTIALS_PATH)
  const keys = JSON.parse(content)
  const key = keys.installed || keys.web
  await fs.writeFile(TOKEN_PATH, JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  }))
}

async function loadSavedTokenIfExist() {
  try {
    const credentials = JSON.parse(await fs.readFile(TOKEN_PATH))
    return google.auth.fromJSON(credentials)
  } catch {
    return null
  }
}

async function authorize() {
  try {
    await fs.readFile(CREDENTIALS_PATH)
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${credsFileName} missing.`)
    throw error
  }

  const savedToken = await loadSavedTokenIfExist()
  if (savedToken) return savedToken

  const client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH })
  if (client.credentials) await saveToken(client)
  return client
}

async function getCalendar() {
  return google.calendar({ version: 'v3', auth: await authorize() })
}

function formatCalendarLocation(address) {
  return formatAddressLocation(address)
}

function calendarDateEnd(value, fieldName) {
  const date = calendarDateToUtc(formatHelsinkiCalendarDate(value, fieldName), fieldName)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatTime(value, fieldName, hasTime) {
  if (!hasTime) return ''
  return `${formatInTimeZone(parseInstant(value, fieldName), 'HH:mm', HELSINKI_TIMEZONE)} `
}

function iconsForOrder(order) {
  const pricing = getOrderPricing(order)
  const distanceIcon = icons.misc[order.distance] || ''
  const feeIcons = pricing.fees.map((fee) => icons.fees[fee.name]).filter(Boolean).join('')
  const serviceIcon = icons.service[order.service?.id] || ''
  const paymentIcon = icons.payment[order.paymentType?.id] || ''
  return {
    move: `${distanceIcon}${feeIcons}${serviceIcon}${paymentIcon}`,
    boxesDelivery: icons.boxes.delivery,
    boxesPickup: icons.boxes.pickup,
  }
}

function makeEntries(order) {
  const orderIcons = iconsForOrder(order)
  const orderTime = formatInTimeZone(parseInstant(order.date, 'order date'), 'HH:mm', HELSINKI_TIMEZONE)
  const moveTitle = `${orderIcons.move}${orderTime}(${order.duration}h)`
  const deliveryTime = formatTime(order.boxes.deliveryDate, 'box delivery date', order.boxes.deliveryHasTime)
  const returnTime = formatTime(order.boxes.returnDate, 'box return date', order.boxes.returnHasTime)
  return {
    move: {
      title: `${moveTitle} ${order.name}`,
      description: `${moveTitle}${formatMoveCalendarDescription(order)}`,
    },
    deliveryDate: {
      title: `${order.boxes.amount} ${orderIcons.boxesDelivery} ${deliveryTime}${order.name}`,
      description: `${order.boxes.amount} ${orderIcons.boxesDelivery} ${deliveryTime}${formatBoxDeliveryCalendarDescription(order)}`,
    },
    returnDate: {
      title: `NOUTO ${order.boxes.amount} ${orderIcons.boxesPickup} ${returnTime}${order.name}`,
      description: `NOUTO ${order.boxes.amount} ${orderIcons.boxesPickup} ${returnTime}${formatBoxReturnCalendarDescription(order)}`,
    },
  }
}

function canceledSummary(order, summary) {
  return order.canceledAt ? `(CANCELED) ${summary}` : summary
}

function eventColor(order, normalColor) {
  return order.canceledAt ? CANCELED_EVENT_COLOR_ID : normalColor
}

function makeCalendarEventResources(order) {
  const entries = makeEntries(order)
  const hours = Math.floor(Number(order.duration))
  const minutes = (Number(order.duration) % 1) * 60
  const resources = {
    main: {
      summary: canceledSummary(order, entries.move.title),
      description: entries.move.description,
      colorId: eventColor(order, resolveEventColorId(order)),
      location: [formatCalendarLocation(order.address)]
        .concat(order.extraAddresses.map(formatCalendarLocation))
        .concat([formatCalendarLocation(order.destination)])
        .join('\n'),
      start: { dateTime: parseInstant(order.date, 'order date').toISOString(), timeZone: HELSINKI_TIMEZONE },
      end: { dateTime: dayjs(order.date).add(hours, 'hour').add(minutes || 0, 'minute').toISOString(), timeZone: HELSINKI_TIMEZONE },
      reminders: { useDefault: false },
    },
  }

  if (order.boxes.amount > 0 && order.boxes.deliveryDate && order.boxes.returnDate) {
    for (const role of ['boxDelivery', 'boxReturn']) {
      const isDelivery = role === 'boxDelivery'
      const dateValue = isDelivery ? order.boxes.deliveryDate : order.boxes.returnDate
      const fieldName = isDelivery ? 'box delivery date' : 'box return date'
      const hasTime = isDelivery ? order.boxes.deliveryHasTime : order.boxes.returnHasTime
      const parsedDate = parseInstant(dateValue, fieldName)
      const dateTime = parsedDate.toISOString()
      const calendarDate = formatHelsinkiCalendarDate(dateValue, fieldName)
      resources[role] = {
        summary: canceledSummary(order, entries[isDelivery ? 'deliveryDate' : 'returnDate'].title),
        description: entries[isDelivery ? 'deliveryDate' : 'returnDate'].description,
        colorId: eventColor(order, '1'),
        location: formatCalendarLocation(isDelivery ? order.address : order.destination),
        start: hasTime ? { dateTime, timeZone: HELSINKI_TIMEZONE } : { date: calendarDate },
        end: hasTime
          ? { dateTime: dayjs(parsedDate).add(1, 'hour').toISOString(), timeZone: HELSINKI_TIMEZONE }
          : { date: calendarDateEnd(dateValue, `${fieldName} end`) },
        reminders: { useDefault: false },
      }
    }
  }

  return resources
}

function orderId(order) {
  const id = order?._id ?? order?.id
  if (!id) throw new Error('Order ID is required for Calendar synchronization')
  return id.toString()
}

function eventId(order, role) {
  return `paku24${orderId(order)}${ROLE_SUFFIX[role]}`
}

function desiredResources(order) {
  if (!order.confirmed || order.deletedAt) return {}
  return makeCalendarEventResources(order)
}

function isStatus(error, status) {
  return [error?.status, error?.statusCode, error?.response?.status].some((value) => Number(value) === status)
}

async function providerInsert(resource) {
  if (env === 'test') return insertTestEvent(resource)
  const response = await (await getCalendar()).events.insert({ calendarId: 'primary', resource })
  return response.data
}

async function providerUpdate(id, resource) {
  if (env === 'test') return updateTestEvent(id, resource)
  const response = await (await getCalendar()).events.update({ calendarId: 'primary', eventId: id, resource })
  return response.data
}

async function providerDelete(id) {
  if (env === 'test') return deleteTestEvent(id)
  await (await getCalendar()).events.delete({ calendarId: 'primary', eventId: id })
}

async function syncOrderToGoogleCalendar(order) {
  const desired = desiredResources(order)
  for (const role of ROLES) {
    const id = eventId(order, role)
    if (desired[role]) {
      try {
        await providerUpdate(id, { ...desired[role], id })
      } catch (error) {
        if (!isStatus(error, 404)) throw error
        try {
          await providerInsert({ ...desired[role], id })
        } catch (insertError) {
          if (!isStatus(insertError, 409)) throw insertError
          await providerUpdate(id, { ...desired[role], id })
        }
      }
    } else {
      try {
        await providerDelete(id)
      } catch (error) {
        if (!isStatus(error, 404)) throw error
      }
    }
  }

  return { ids: Object.fromEntries(ROLES.map((role) => [role, eventId(order, role)])) }
}

export { authorize, getCalendar, makeCalendarEventResources, syncOrderToGoogleCalendar }
