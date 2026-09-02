import distances from '../data/distances.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import colors from '../data/colors.json' with { type: 'json' }
import { isDateOnly, parseCalendarDate, parseInstant } from './date-fns-tz.js'
import { normalizeFeeList } from './orderPricing.js'
import {
  cloneValue,
  hasOwn,
  isPlainObject,
  OrderValidationError,
  PRICING_COMPONENTS,
  toFiniteNumberOrNull,
} from './orderPrimitives.js'

const BOOKING_FIELDS = [
  'distance',
  'hsy',
  'eventColor',
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

const CALENDAR_EVENT_ROLES = ['main', 'boxDelivery', 'boxReturn']
const BOX_FIELDS = [
  'deliveryDate',
  'returnDate',
  'amount',
  'pricePerBox',
  'deliveryPrice',
  'returnPrice',
]
const BOX_NUMBER_FIELDS = ['amount', 'pricePerBox', 'deliveryPrice', 'returnPrice']
const NULLABLE_BOOKING_FIELDS = new Set(['eventColor', 'name', 'email', 'phone', 'comment'])
const STRING_BOOKING_FIELDS = new Set(['distance', 'name', 'email', 'phone', 'comment', 'eventColor'])
const BOOLEAN_BOOKING_FIELDS = new Set(['hsy'])

function makeCalendarEventIds() {
  return Object.fromEntries(CALENDAR_EVENT_ROLES.map((role) => [role, null]))
}

function makeAddress() {
  return {
    street: '',
    index: '',
    city: '',
    floor: 0,
    elevator: false,
  }
}

function makeBoxes(now = new Date()) {
  return {
    deliveryDate: new Date(now.getTime()),
    returnDate: new Date(now.getTime()),
    amount: 0,
  }
}

function makePricingOverrides() {
  return {
    price: null,
    fees: null,
    boxesPrice: null,
  }
}

function makeDefaultState() {
  const now = new Date()
  const service = services[0] || {}
  const paymentType = paymentTypes[0] || {}

  return {
    distance: distances.insideCapital,
    hsy: false,
    eventColor: null,
    date: new Date(now.getTime()),
    duration: 1,
    service: {
      ...cloneValue(service),
      pricePerHour: toFiniteNumberOrNull(service.pricePerHour) ?? 0,
    },
    paymentType: {
      ...cloneValue(paymentType),
      fee: toFiniteNumberOrNull(paymentType.fee) ?? 0,
    },
    address: makeAddress(),
    extraAddresses: [],
    destination: makeAddress(),
    boxes: makeBoxes(now),
    name: '',
    email: '',
    phone: '',
    comment: '',
    pricingOverrides: makePricingOverrides(),
    originalOrder: null,
    id: null,
    confirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    receivedAt: null,
    canceledAt: null,
    deletedAt: null,
    invoiceNumber: null,
    calendarEventIds: makeCalendarEventIds(),
  }
}

function normalizeBoxDate(value, fieldName) {
  if (isDateOnly(value)) {
    parseCalendarDate(value, fieldName)
    return value
  }

  return parseInstant(value, fieldName)
}

function normalizePricingValue(component, value, fieldName) {
  if (component === 'fees') return normalizeFeeList(value, `Invalid ${fieldName}`).map(cloneValue)

  const number = toFiniteNumberOrNull(value)
  if (number === null) throw new OrderValidationError(`Invalid ${fieldName}`)
  return number
}

function normalizePricingOverrides(value) {
  if (value === null || value === undefined) return makePricingOverrides()
  if (!isPlainObject(value)) throw new OrderValidationError('Invalid pricingOverrides')

  return Object.fromEntries(
    PRICING_COMPONENTS.map((component) => {
      const componentValue = value[component]
      if (componentValue === null || componentValue === undefined) return [component, null]
      return [
        component,
        normalizePricingValue(component, componentValue, `pricingOverrides.${component}`),
      ]
    }),
  )
}

function requireObject(value, field) {
  if (!isPlainObject(value)) throw new OrderValidationError(`Invalid ${field}`)
  return value
}

function normalizeAddress(value, field = 'address') {
  requireObject(value, field)
  for (const key of ['street', 'index', 'city', 'floor', 'elevator']) {
    if (!hasOwn(value, key) || value[key] === undefined || value[key] === null) {
      throw new OrderValidationError(`Invalid ${field}.${key}: required`)
    }
  }
  if (typeof value.street !== 'string') throw new OrderValidationError(`Invalid ${field}.street`)
  if (typeof value.index !== 'string') throw new OrderValidationError(`Invalid ${field}.index`)
  if (typeof value.city !== 'string') throw new OrderValidationError(`Invalid ${field}.city`)

  const floor = toFiniteNumberOrNull(value.floor)
  if (floor === null) throw new OrderValidationError(`Invalid ${field}.floor`)
  if (typeof value.elevator !== 'boolean') throw new OrderValidationError(`Invalid ${field}.elevator`)

  return {
    street: value.street,
    index: value.index,
    city: value.city,
    floor,
    elevator: value.elevator,
  }
}

function normalizeEmbedded(value, field, requiredNumberField) {
  const input = requireObject(value, field)

  if (!hasOwn(input, 'id') || input.id === null || input.id === undefined || input.id === '') {
    throw new OrderValidationError(`Invalid ${field}.id: required`)
  }
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new OrderValidationError(`Invalid ${field}.name: required`)
  }
  if (requiredNumberField && !hasOwn(input, requiredNumberField)) {
    throw new OrderValidationError(`Invalid ${field}.${requiredNumberField}: required`)
  }

  const normalized = cloneValue(input)
  for (const key of [requiredNumberField, 'fee']) {
    if (!key || !hasOwn(normalized, key)) continue
    const number = toFiniteNumberOrNull(normalized[key])
    if (number === null) throw new OrderValidationError(`Invalid ${field}.${key}`)
    normalized[key] = number
  }

  return normalized
}

function normalizeService(value, field = 'service') {
  return normalizeEmbedded(value, field, 'pricePerHour')
}

function normalizePaymentType(value, field = 'paymentType') {
  return normalizeEmbedded(value, field, null)
}

function normalizeSimpleField(field, value) {
  if (field === 'eventColor') {
    if (value === null) return null
    if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(colors, value)) {
      throw new OrderValidationError(`Invalid ${field}`)
    }
    return value
  }

  if (STRING_BOOKING_FIELDS.has(field)) {
    if (value !== null && typeof value !== 'string') {
      throw new OrderValidationError(`Invalid ${field}`)
    }
    return value
  }

  if (BOOLEAN_BOOKING_FIELDS.has(field) && typeof value !== 'boolean') {
    throw new OrderValidationError(`Invalid ${field}`)
  }

  return value
}

function normalizeDuration(value, field = 'duration') {
  const duration = toFiniteNumberOrNull(value)
  if (duration === null) throw new OrderValidationError(`Invalid ${field}`)
  return duration
}

function normalizeBoxes(value, field = 'boxes') {
  requireObject(value, field)
  for (const key of ['deliveryDate', 'returnDate', 'amount']) {
    if (!hasOwn(value, key) || value[key] === undefined || value[key] === null) {
      throw new OrderValidationError(`Invalid ${field}.${key}: required`)
    }
  }
  const boxes = {}
  for (const boxField of BOX_FIELDS) {
    if (hasOwn(value, boxField)) boxes[boxField] = cloneValue(value[boxField])
  }

  for (const boxField of BOX_NUMBER_FIELDS) {
    if (!hasOwn(boxes, boxField)) continue
    const number = toFiniteNumberOrNull(boxes[boxField])
    if (number === null || (boxField === 'amount' && number < 0)) {
      throw new OrderValidationError(`Invalid ${field}.${boxField}`)
    }
    boxes[boxField] = number
  }

  for (const dateField of ['deliveryDate', 'returnDate']) {
    boxes[dateField] = normalizeBoxDate(boxes[dateField], `${field}.${dateField}`)
  }

  return boxes
}

function assertOrderPatch(patch) {
  if (!isPlainObject(patch)) throw new OrderValidationError('updateData must be a plain object')

  for (const key of Object.keys(patch)) {
    if (key !== 'pricingOverrides' && !BOOKING_FIELDS.includes(key)) {
      throw new OrderValidationError(`Field is not editable: ${key}`)
    }
  }
}

function normalizeOrderPatch(patch) {
  assertOrderPatch(patch)

  const normalized = {}
  if (hasOwn(patch, 'pricingOverrides')) {
    normalized.pricingOverrides = normalizePricingOverrides(patch.pricingOverrides)
  }

  for (const field of BOOKING_FIELDS) {
    if (!hasOwn(patch, field)) continue

    const value = patch[field]
    if ((value === null || value === undefined) && !NULLABLE_BOOKING_FIELDS.has(field)) {
      throw new OrderValidationError(`Invalid ${field}`)
    }

    let nextValue = value
    if (field === 'date') {
      nextValue = parseInstant(value, 'date')
    } else if (field === 'duration') {
      nextValue = normalizeDuration(value)
    } else if (field === 'boxes') {
      nextValue = normalizeBoxes(value)
    } else if (field === 'address' || field === 'destination') {
      nextValue = normalizeAddress(value, field)
    } else if (field === 'service') {
      nextValue = normalizeService(value, field)
    } else if (field === 'paymentType') {
      nextValue = normalizePaymentType(value, field)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(value)) throw new OrderValidationError('Invalid extraAddresses')
      nextValue = value.map((address, index) =>
        normalizeAddress(address, `extraAddresses.${index}`),
      )
    } else if (STRING_BOOKING_FIELDS.has(field) || BOOLEAN_BOOKING_FIELDS.has(field)) {
      nextValue = normalizeSimpleField(field, value)
    }

    normalized[field] = cloneValue(nextValue)
  }

  return normalized
}

function updateOrderField(order, key, value) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) {
    throw new OrderValidationError('Order must be an object')
  }
  return { ...order, ...normalizeOrderPatch({ [key]: value }) }
}

function createAppOrder(input = {}) {
  if (!isPlainObject(input)) throw new OrderValidationError('Order must be an object')

  const defaults = makeDefaultState()
  const result = {
    ...defaults,
    service: cloneValue(defaults.service),
    paymentType: cloneValue(defaults.paymentType),
    address: cloneValue(defaults.address),
    extraAddresses: [],
    destination: cloneValue(defaults.destination),
    boxes: cloneValue(defaults.boxes),
    pricingOverrides: makePricingOverrides(),
    originalOrder: null,
  }

  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === undefined) return
    if (input[field] === null && !NULLABLE_BOOKING_FIELDS.has(field)) {
      throw new OrderValidationError(`Invalid ${field}`)
    }

    if (field === 'date') result.date = parseInstant(input.date, 'date')
    else if (field === 'duration') result.duration = normalizeDuration(input.duration)
    else if (field === 'boxes') {
      result.boxes = normalizeBoxes({ ...defaults.boxes, ...requireObject(input.boxes, 'boxes') })
    }
    else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new OrderValidationError('Invalid extraAddresses')
      result.extraAddresses = input.extraAddresses.map((address, index) =>
        normalizeAddress(address, `extraAddresses.${index}`),
      )
    } else if (field === 'address' || field === 'destination') {
      result[field] = normalizeAddress(
        { ...result[field], ...requireObject(input[field], field) },
        field,
      )
    } else if (field === 'service') {
      result[field] = normalizeService(input[field])
    } else if (field === 'paymentType') {
      result[field] = normalizePaymentType(input[field])
    } else {
      result[field] = normalizeSimpleField(field, input[field])
    }
  })

  result.pricingOverrides = normalizePricingOverrides(input.pricingOverrides)
  return result
}

function createWordPressOrder(input = {}, originalOrder = input) {
  if (!isPlainObject(input)) throw new OrderValidationError('Order must be an object')
  if (!isPlainObject(originalOrder)) throw new OrderValidationError('Original WordPress order must be an object')

  const booking = createAppOrder(input)
  return {
    ...booking,
    originalOrder: cloneValue(originalOrder),
  }
}

export {
  BOOKING_FIELDS,
  CALENDAR_EVENT_ROLES,
  makeCalendarEventIds,
  normalizeAddress,
  normalizeBoxes,
  normalizeService,
  normalizePaymentType,
  normalizePricingOverrides,
  normalizeDuration,
  normalizeSimpleField,
  normalizeOrderPatch,
  createAppOrder,
  createWordPressOrder,
  updateOrderField,
}
