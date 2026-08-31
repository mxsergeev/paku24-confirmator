import { isDateOnly, parseCalendarDate, parseInstant } from './date-fns-tz.js'
import {
  cloneValue,
  hasOwn,
  isPlainObject,
  OrderValidationError,
  PRICING_COMPONENTS,
  requireFiniteNumber,
} from './orderPrimitives.js'

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

function normalizeAddress(value, field) {
  if (!isPlainObject(value)) throw new OrderValidationError(`Invalid ${field}: expected a structured address`)

  for (const key of ['street', 'index', 'city']) {
    if (typeof value[key] !== 'string' || value[key].trim() === '') {
      throw new OrderValidationError(`Invalid ${field}.${key}`)
    }
  }
  if (value.elevator !== undefined && typeof value.elevator !== 'boolean') {
    throw new OrderValidationError(`Invalid ${field}.elevator`)
  }

  return {
    street: value.street,
    index: value.index,
    city: value.city,
    floor:
      value.floor === null || value.floor === undefined
        ? 0
        : requireFiniteNumber(value.floor, `${field}.floor`),
    elevator: value.elevator ?? false,
  }
}

function normalizeEmbedded(value, field, rateField) {
  if (!isPlainObject(value)) throw new OrderValidationError(`Invalid ${field}: expected an object`)
  if (!hasOwn(value, 'id') || value.id === null || value.id === '') {
    throw new OrderValidationError(`Invalid ${field}.id`)
  }
  if (!hasOwn(value, 'name') || typeof value.name !== 'string' || value.name.trim() === '') {
    throw new OrderValidationError(`Invalid ${field}.name`)
  }
  if (!hasOwn(value, rateField)) throw new OrderValidationError(`Invalid ${field}.${rateField}`)

  return {
    ...cloneValue(value),
    [rateField]: requireFiniteNumber(value[rateField], `${field}.${rateField}`),
  }
}

function normalizeFees(value) {
  if (!Array.isArray(value)) throw new OrderValidationError('Invalid fees: expected an array')
  return value.map((fee, index) => {
    if (!isPlainObject(fee)) throw new OrderValidationError(`Invalid fees.${index}: expected an object`)
    if (typeof fee.name !== 'string' || fee.name.trim() === '') {
      throw new OrderValidationError(`Invalid fees.${index}.name`)
    }
    if (!hasOwn(fee, 'amount')) throw new OrderValidationError(`Invalid fees.${index}.amount`)
    return { ...cloneValue(fee), amount: requireFiniteNumber(fee.amount, `fees.${index}.amount`) }
  })
}

function normalizeBoxDate(value, field) {
  if (isDateOnly(value)) {
    parseCalendarDate(value, field)
    return value
  }
  return parseInstant(value, field)
}

function normalizeBoxes(value, orderDate) {
  if (!isPlainObject(value)) throw new OrderValidationError('Invalid boxes: expected an object')
  if (Object.keys(value).length === 0) {
    return {
      amount: 0,
      deliveryDate: new Date(orderDate.getTime()),
      returnDate: new Date(orderDate.getTime()),
    }
  }

  for (const key of ['amount', 'deliveryDate', 'returnDate']) {
    if (!hasOwn(value, key)) throw new OrderValidationError(`Invalid boxes.${key}: required for populated boxes`)
  }

  const boxes = {
    amount: requireFiniteNumber(value.amount, 'boxes.amount'),
    deliveryDate: normalizeBoxDate(value.deliveryDate, 'boxes.deliveryDate'),
    returnDate: normalizeBoxDate(value.returnDate, 'boxes.returnDate'),
  }
  if (boxes.amount < 0) throw new OrderValidationError('Invalid boxes.amount: must be non-negative')

  BOX_PRICE_FIELDS.forEach((field) => {
    if (hasOwn(value, field)) boxes[field] = requireFiniteNumber(value[field], `boxes.${field}`)
  })
  return boxes
}

export function normalizeWordPressOrderPayload(input) {
  if (!isPlainObject(input)) throw new OrderValidationError('WordPress order payload must be a plain object')

  for (const field of ['date', 'duration', 'service', 'paymentType', 'address', 'extraAddresses', 'destination', 'boxes']) {
    if (!hasOwn(input, field)) throw new OrderValidationError(`Invalid ${field}: required`)
  }

  const result = {}
  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(input, field)) return

    if (field === 'date') result.date = parseInstant(input.date, 'date')
    else if (field === 'duration') result.duration = requireFiniteNumber(input.duration, 'duration')
    else if (field === 'service') result.service = normalizeEmbedded(input.service, 'service', 'pricePerHour')
    else if (field === 'paymentType') result.paymentType = normalizeEmbedded(input.paymentType, 'paymentType', 'fee')
    else if (field === 'address' || field === 'destination') result[field] = normalizeAddress(input[field], field)
    else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new OrderValidationError('Invalid extraAddresses: expected an array')
      result.extraAddresses = input.extraAddresses.map((address, index) => normalizeAddress(address, `extraAddresses.${index}`))
    } else if (field === 'boxes') result.boxes = normalizeBoxes(input.boxes, result.date)
    else result[field] = cloneValue(input[field])
  })

  PRICING_COMPONENTS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === null || input[field] === undefined) return
    result[field] = field === 'fees' ? normalizeFees(input.fees) : requireFiniteNumber(input[field], field)
  })

  return result
}
