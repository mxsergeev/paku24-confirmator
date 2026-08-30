import { isDateOnly, parseDateOnly } from './date-fns-tz.js'

const BOOKING_FIELDS = [
  'date',
  'duration',
  'service',
  'paymentType',
  'address',
  'extraAddresses',
  'destination',
  'boxes',
  'name',
  'email',
  'phone',
  'comment',
]

const BOX_PRICE_FIELDS = ['pricePerBox', 'deliveryPrice', 'returnPrice']
const PRICE_FIELDS = ['price', 'fees', 'boxesPrice']
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:?\d{2})$/i

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function finiteNumber(value, field) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`Invalid ${field}: expected a finite number`)
  }
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`Invalid ${field}: expected a finite number`)
  }

  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`Invalid ${field}: expected a finite number`)
  return number
}

function cloneValue(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (Array.isArray(value)) return value.map(cloneValue)
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }
  return value
}

function parseIsoInstant(value, field) {
  if (typeof value !== 'string' || !ISO_INSTANT.test(value)) {
    throw new Error(`Invalid ${field}: expected an ISO instant with timezone`)
  }

  parseDateOnly(value.slice(0, 10), field)

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid ${field}: expected an ISO instant with timezone`)
  }
  return date
}

function normalizeAddress(value, field) {
  if (!isPlainObject(value)) throw new Error(`Invalid ${field}: expected a structured address`)

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
    floor: value.floor === null || value.floor === undefined ? 0 : finiteNumber(value.floor, `${field}.floor`),
    elevator: value.elevator ?? false,
  }
}

function normalizeEmbedded(value, field, rateField) {
  if (!isPlainObject(value)) throw new Error(`Invalid ${field}: expected an object`)
  if (!hasOwn(value, 'id') || value.id === null || value.id === '') {
    throw new Error(`Invalid ${field}.id`)
  }
  if (!hasOwn(value, 'name') || typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error(`Invalid ${field}.name`)
  }
  if (!hasOwn(value, rateField)) throw new Error(`Invalid ${field}.${rateField}`)

  return {
    ...cloneValue(value),
    [rateField]: finiteNumber(value[rateField], `${field}.${rateField}`),
  }
}

function normalizeFees(value) {
  if (!Array.isArray(value)) throw new Error('Invalid fees: expected an array')
  return value.map((fee, index) => {
    if (!isPlainObject(fee)) throw new Error(`Invalid fees.${index}: expected an object`)
    if (typeof fee.name !== 'string' || fee.name.trim() === '') {
      throw new Error(`Invalid fees.${index}.name`)
    }
    if (!hasOwn(fee, 'amount')) throw new Error(`Invalid fees.${index}.amount`)
    return { ...cloneValue(fee), amount: finiteNumber(fee.amount, `fees.${index}.amount`) }
  })
}

function normalizeBoxDate(value, field) {
  if (isDateOnly(value)) {
    parseDateOnly(value, field)
    return value
  }
  return parseIsoInstant(value, field)
}

function normalizeBoxes(value, orderDate) {
  if (!isPlainObject(value)) throw new Error('Invalid boxes: expected an object')
  if (Object.keys(value).length === 0) {
    return {
      amount: 0,
      deliveryDate: new Date(orderDate.getTime()),
      returnDate: new Date(orderDate.getTime()),
    }
  }

  for (const key of ['amount', 'deliveryDate', 'returnDate']) {
    if (!hasOwn(value, key)) throw new Error(`Invalid boxes.${key}: required for populated boxes`)
  }

  const boxes = {
    amount: finiteNumber(value.amount, 'boxes.amount'),
    deliveryDate: normalizeBoxDate(value.deliveryDate, 'boxes.deliveryDate'),
    returnDate: normalizeBoxDate(value.returnDate, 'boxes.returnDate'),
  }
  if (boxes.amount < 0) throw new Error('Invalid boxes.amount: must be non-negative')

  BOX_PRICE_FIELDS.forEach((field) => {
    if (hasOwn(value, field)) boxes[field] = finiteNumber(value[field], `boxes.${field}`)
  })
  return boxes
}

export function normalizeWordPressOrderPayload(input) {
  if (!isPlainObject(input)) throw new Error('WordPress order payload must be a plain object')

  for (const field of ['date', 'duration', 'service', 'paymentType', 'address', 'extraAddresses', 'destination', 'boxes']) {
    if (!hasOwn(input, field)) throw new Error(`Invalid ${field}: required`)
  }

  const result = {}
  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(input, field)) return

    if (field === 'date') result.date = parseIsoInstant(input.date, 'date')
    else if (field === 'duration') result.duration = finiteNumber(input.duration, 'duration')
    else if (field === 'service') result.service = normalizeEmbedded(input.service, 'service', 'pricePerHour')
    else if (field === 'paymentType') result.paymentType = normalizeEmbedded(input.paymentType, 'paymentType', 'fee')
    else if (field === 'address' || field === 'destination') result[field] = normalizeAddress(input[field], field)
    else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new Error('Invalid extraAddresses: expected an array')
      result.extraAddresses = input.extraAddresses.map((address, index) => normalizeAddress(address, `extraAddresses.${index}`))
    } else if (field === 'boxes') result.boxes = normalizeBoxes(input.boxes, result.date)
    else result[field] = cloneValue(input[field])
  })

  PRICE_FIELDS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === null || input[field] === undefined) return
    result[field] = field === 'fees' ? normalizeFees(input.fees) : finiteNumber(input[field], field)
  })

  return result
}
