import { calendarDateToUtc, isDateOnly, parseInstant } from './date-fns-tz.js'
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const hasOwn = (value, key) => Object.hasOwn(value, key)
const clone = (value) => structuredClone(value)
const finiteNumber = (value, field) => {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Invalid ${field}`)
  return number
}

const BOX_BOOKING_FIELDS = ['amount', 'deliveryDate', 'returnDate']

function normalizeAddress(value, field) {
  if (!isObject(value)) throw new Error(`Invalid ${field}: expected a structured address`)

  for (const key of ['street', 'index', 'city']) {
    if (typeof value[key] !== 'string' || value[key].trim() === '') {
      throw new Error(`Invalid ${field}.${key}`)
    }
  }
  if (value.elevator !== undefined && typeof value.elevator !== 'boolean') {
    throw new Error(`Invalid ${field}.elevator`)
  }

  return {
    street: value.street,
    index: value.index,
    city: value.city,
    floor:
      value.floor === null || value.floor === undefined
        ? 0
        : finiteNumber(value.floor, `${field}.floor`),
    elevator: value.elevator ?? false,
  }
}

function normalizeEmbedded(value, field, rateField, fields) {
  if (!isObject(value)) throw new Error(`Invalid ${field}: expected an object`)
  if (!hasOwn(value, 'id') || value.id === null || value.id === undefined || value.id === '') {
    throw new Error(`Invalid ${field}.id`)
  }
  if (!hasOwn(value, 'name') || typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error(`Invalid ${field}.name`)
  }
  if (!hasOwn(value, rateField)) throw new Error(`Invalid ${field}.${rateField}`)

  const normalized = {}
  for (const key of fields) {
    if (hasOwn(value, key)) normalized[key] = clone(value[key])
  }
  normalized[rateField] = finiteNumber(value[rateField], `${field}.${rateField}`)
  return normalized
}

function normalizeBoxDate(value, field) {
  if (isDateOnly(value)) {
    return { date: calendarDateToUtc(value, field), hasTime: false }
  }
  return { date: parseInstant(value, field), hasTime: true }
}

function normalizeWordPressString(value, field) {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  throw new Error(`Invalid ${field}`)
}

function normalizeBoxes(value, orderDate) {
  if (!isObject(value)) throw new Error('Invalid boxes: expected an object')
  const suppliedBookingFields = BOX_BOOKING_FIELDS.filter((field) => hasOwn(value, field))
  if (suppliedBookingFields.length === 0) {
    return {
      amount: 0,
      deliveryDate: new Date(orderDate.getTime()),
      deliveryHasTime: true,
      returnDate: new Date(orderDate.getTime()),
      returnHasTime: true,
    }
  }

  for (const key of BOX_BOOKING_FIELDS) {
    if (!hasOwn(value, key)) throw new Error(`Invalid boxes.${key}: required for populated boxes`)
  }

  const delivery = normalizeBoxDate(value.deliveryDate, 'boxes.deliveryDate')
  const returned = normalizeBoxDate(value.returnDate, 'boxes.returnDate')
  const boxes = {
    amount: finiteNumber(value.amount, 'boxes.amount'),
    deliveryDate: delivery.date,
    deliveryHasTime: delivery.hasTime,
    returnDate: returned.date,
    returnHasTime: returned.hasTime,
  }
  if (boxes.amount < 0) throw new Error('Invalid boxes.amount: must be non-negative')

  return boxes
}

export function normalizeWordPressOrderPayload(input) {
  if (!isObject(input)) throw new Error('WordPress order payload must be a plain object')

  for (const field of ['date', 'duration', 'service', 'paymentType', 'address', 'extraAddresses', 'destination', 'boxes']) {
    if (!hasOwn(input, field)) throw new Error(`Invalid ${field}: required`)
  }

  const date = parseInstant(input.date, 'date')
  const result = {
    date,
    duration: finiteNumber(input.duration, 'duration'),
    service: normalizeEmbedded(input.service, 'service', 'pricePerHour', [
      'id',
      'name',
      'pricePerHour',
      'eventColor',
      'hsy',
      'multiplier',
    ]),
    paymentType: normalizeEmbedded(input.paymentType, 'paymentType', 'fee', [
      'id',
      'name',
      'fee',
      'additionalFieldLabel',
      'additionalFieldValue',
    ]),
    address: normalizeAddress(input.address, 'address'),
    extraAddresses: Array.isArray(input.extraAddresses)
      ? input.extraAddresses.map((address, index) => normalizeAddress(address, `extraAddresses.${index}`))
      : (() => {
          throw new Error('Invalid extraAddresses: expected an array')
        })(),
    destination: normalizeAddress(input.destination, 'destination'),
    boxes: normalizeBoxes(input.boxes, date),
    pricingOverrides: { price: null, fees: null, boxesPrice: null },
  }

  for (const field of ['name', 'email', 'phone', 'comment']) {
    if (hasOwn(input, field)) result[field] = normalizeWordPressString(input[field], field)
  }

  return result
}
