import axios from 'axios'
import termsData from '../email/email.data.terms.json' with { type: 'json' }
import Order from '../../../src/shared/Order.js'
import { SEMYSMS_DEVICE_ID, SEMYSMS_API_TOKEN } from '../../utils/config.js'

const MAX_PARTS_PER_SEND = 3
const GSM_7BIT_BASIC_CHARS =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001BÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM_7BIT_EXTENDED_CHARS = '^{}\\[~]|€'

const gsm7BasicSet = new Set(GSM_7BIT_BASIC_CHARS.split(''))
const gsm7ExtendedSet = new Set(GSM_7BIT_EXTENDED_CHARS.split(''))

function isGsm7BitMessage(message) {
  for (const char of message) {
    if (!gsm7BasicSet.has(char) && !gsm7ExtendedSet.has(char)) {
      return false
    }
  }
  return true
}

function splitMessageIntoSegments(message) {
  if (!message) {
    return []
  }

  const isGsm = isGsm7BitMessage(message)
  const singlePartLimit = isGsm ? 160 : 70

  if (message.length <= singlePartLimit) {
    return [message]
  }

  const perPartLimit = isGsm ? 153 : 67
  const segments = []
  let current = ''
  let currentLength = 0

  for (const char of message) {
    const charWeight = isGsm && gsm7ExtendedSet.has(char) ? 2 : 1
    if (currentLength + charWeight > perPartLimit) {
      segments.push(current)
      current = ''
      currentLength = 0
    }
    current += char
    currentLength += charWeight
  }

  if (current) {
    segments.push(current)
  }

  return segments
}

function chunkMessageForSending(message) {
  const segments = splitMessageIntoSegments(message)
  if (!segments.length) {
    return { chunks: [], totalSegments: 0 }
  }

  const chunks = []
  for (let i = 0; i < segments.length; i += MAX_PARTS_PER_SEND) {
    const chunkSegments = segments.slice(i, i + MAX_PARTS_PER_SEND)
    chunks.push(chunkSegments.join(''))
  }

  return {
    chunks,
    totalSegments: segments.length,
  }
}

async function sendSmsInChunks(phone, message, { maxChunks = 3 } = {}) {
  if (!Number.isInteger(maxChunks) || maxChunks < 1) {
    throw new Error('maxChunks must be a positive integer')
  }

  const { chunks, totalSegments } = chunkMessageForSending(message)
  if (chunks.length > maxChunks) {
    throw new Error(
      `This SMS message consists of ${chunks.length} chunk(s), which exceeds the limit of ${maxChunks}`
    )
  }
  const responses = []
  for (const [index, chunk] of chunks.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const response = await sendSMSWithGateway(phone, chunk)
    responses.push({
      index: index + 1,
      response,
    })
  }

  return {
    chunkCount: chunks.length,
    totalSegments,
    responses,
  }
}

function sendSMSWithGateway(phone, msg) {
  if (!phone || !msg) {
    throw new Error('Phone number and message are required to send SMS')
  }

  if (!SEMYSMS_API_TOKEN || !SEMYSMS_DEVICE_ID) {
    throw new Error('SMS Gateway configuration is missing')
  }

  if (process.env.NODE_ENV === 'development') {
    return Promise.resolve({ success: true })
  }

  const urlSend = 'https://semysms.net/api/3/sms.php'
  return axios
    .get(urlSend, {
      params: {
        token: SEMYSMS_API_TOKEN,
        device: SEMYSMS_DEVICE_ID,
        phone,
        msg,
      },
    })
    .then((res) => {
      if (res.data.error) throw new Error(res.data.error)
      return res.data
    })
}

function constructMessage(order) {
  const orderData = Order.format(order)

  if (!orderData || orderData.length === 0) {
    throw new Error('Invalid order data for SMS')
  }

  const message = `VARAUSVAHVISTUS\n${orderData}\nKIITOS VARAUKSESTANNE!\n\n${termsData.agreesToTerms}`

  return message
}

export {
  splitMessageIntoSegments,
  chunkMessageForSending,
  sendSmsInChunks,
  sendSMSWithGateway,
  constructMessage,
}
