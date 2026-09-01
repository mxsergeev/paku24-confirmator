import distances from '../data/distances.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
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
  'XL',
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

const LIFECYCLE_FIELDS = [
  'id',
  'confirmed',
  'confirmedBy',
  'confirmedAt',
  'receivedAt',
  'canceledAt',
  'deletedAt',
  'invoiceNumber',
  'calendarEventIds',
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
const BOOLEAN_BOOKING_FIELDS = new Set(['hsy', 'XL'])

function makeCalendarEventIds() {
  return Object.fromEntries(CALENDAR_EVENT_ROLES.map((role) => [role, null]))
}

function normalizeCalendarEventIds(value) {
  if (value === null || value === undefined) return makeCalendarEventIds()
  if (!isPlainObject(value)) throw new OrderValidationError('Invalid calendarEventIds')

  return Object.fromEntries(
    CALENDAR_EVENT_ROLES.map((role) => {
      const eventId = value[role]
      if (eventId !== null && eventId !== undefined && typeof eventId !== 'string') {
        throw new OrderValidationError(`Invalid calendarEventIds.${role}`)
      }
      return [role, eventId || null]
    }),
  )
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
    XL: false,
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

function normalizeBoxesShape(value, fieldName, fallback = null) {
  if (!isPlainObject(value)) throw new OrderValidationError(`Invalid ${fieldName}`)

  const defaults = isPlainObject(fallback) ? fallback : {}
  const boxes = {}
  BOX_FIELDS.forEach((field) => {
    if (hasOwn(value, field)) boxes[field] = cloneValue(value[field])
    else if (hasOwn(defaults, field)) boxes[field] = cloneValue(defaults[field])
  })

  for (const field of BOX_NUMBER_FIELDS) {
    if (!hasOwn(boxes, field)) continue
    const number = toFiniteNumberOrNull(boxes[field])
    if (number === null || (field === 'amount' && number < 0)) {
      throw new OrderValidationError(`Invalid ${fieldName}.${field}`)
    }
    boxes[field] = number
  }

  for (const field of ['deliveryDate', 'returnDate']) {
    if (hasOwn(boxes, field)) boxes[field] = normalizeBoxDate(boxes[field], `${fieldName}.${field}`)
  }

  return boxes
}

function normalizeCurrentBoxes(value, fallback) {
  if (value === null) throw new OrderValidationError('Invalid boxes')

  const boxes = normalizeBoxesShape(value === undefined ? {} : value, 'boxes', fallback)
  if (!hasOwn(boxes, 'amount') || !hasOwn(boxes, 'deliveryDate') || !hasOwn(boxes, 'returnDate')) {
    throw new OrderValidationError('Invalid boxes')
  }
  return boxes
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

function defaultLifecycleState() {
  return {
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

function requireField(input, field, { allowNull = false } = {}) {
  if (!hasOwn(input, field) || input[field] === undefined || (!allowNull && input[field] === null)) {
    throw new OrderValidationError(`Invalid order: ${field} is required`)
  }
  return input[field]
}

function requireObject(value, field) {
  if (!isPlainObject(value)) throw new OrderValidationError(`Invalid ${field}`)
  return value
}

function normalizeCanonicalAddress(value, field) {
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

function normalizeAddressWithFallback(value, field, fallback = makeAddress()) {
  return normalizeCanonicalAddress({ ...fallback, ...requireObject(value, field) }, field)
}

function normalizeEmbeddedWithFallback(value, field, requiredNumberField, fallback = null) {
  const input = requireObject(value, field)
  const embedded = fallback ? { ...fallback, ...input } : input

  if (!hasOwn(embedded, 'id') || embedded.id === null || embedded.id === undefined || embedded.id === '') {
    throw new OrderValidationError(`Invalid ${field}.id: required`)
  }
  if (typeof embedded.name !== 'string' || embedded.name.trim() === '') {
    throw new OrderValidationError(`Invalid ${field}.name: required`)
  }
  if (requiredNumberField && !hasOwn(embedded, requiredNumberField)) {
    throw new OrderValidationError(`Invalid ${field}.${requiredNumberField}: required`)
  }

  const normalized = cloneValue(embedded)
  for (const key of [requiredNumberField, 'fee']) {
    if (!key || !hasOwn(normalized, key)) continue
    const number = toFiniteNumberOrNull(normalized[key])
    if (number === null) throw new OrderValidationError(`Invalid ${field}.${key}`)
    normalized[key] = number
  }

  return normalized
}

function normalizeSimpleBookingField(field, value) {
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

function normalizeCanonicalBoxes(value, field = 'boxes') {
  requireObject(value, field)
  for (const key of ['deliveryDate', 'returnDate', 'amount']) {
    if (!hasOwn(value, key) || value[key] === undefined || value[key] === null) {
      throw new OrderValidationError(`Invalid ${field}.${key}: required`)
    }
  }
  return normalizeBoxesShape(value, field)
}

function normalizeCanonicalBooking(input, fieldPrefix = '') {
  const result = {}

  BOOKING_FIELDS.forEach((field) => {
    const value = requireField(input, field, { allowNull: NULLABLE_BOOKING_FIELDS.has(field) })
    const fieldName = fieldPrefix ? `${fieldPrefix}.${field}` : field

    if (field === 'date') result[field] = parseInstant(value, fieldName)
    else if (field === 'boxes') result[field] = normalizeCanonicalBoxes(value, fieldName)
    else if (field === 'address' || field === 'destination') {
      result[field] = normalizeCanonicalAddress(value, fieldName)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(value)) throw new OrderValidationError(`Invalid ${fieldName}`)
      result[field] = value.map((address, index) =>
        normalizeCanonicalAddress(address, `${fieldName}.${index}`),
      )
    } else if (field === 'duration') {
      result[field] = normalizeDuration(value, fieldName)
    } else if (field === 'service') {
      result[field] = normalizeEmbeddedWithFallback(value, fieldName, 'pricePerHour')
    } else if (field === 'paymentType') {
      result[field] = normalizeEmbeddedWithFallback(value, fieldName, null)
    } else if (STRING_BOOKING_FIELDS.has(field) || BOOLEAN_BOOKING_FIELDS.has(field)) {
      result[field] = normalizeSimpleBookingField(field, value)
    }
  })

  return result
}

function normalizeCanonicalLifecycle(input, result) {
  const lifecycle = defaultLifecycleState()

  LIFECYCLE_FIELDS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === undefined) return

    if (field === 'confirmed') {
      if (typeof input[field] !== 'boolean') throw new OrderValidationError(`Invalid ${field}`)
      lifecycle[field] = input[field]
    } else if (field === 'calendarEventIds') {
      lifecycle[field] = normalizeCalendarEventIds(input[field])
    } else if (field.endsWith('At') || field === 'receivedAt') {
      lifecycle[field] = input[field] === null ? null : parseInstant(input[field], field)
    } else {
      lifecycle[field] = cloneValue(input[field])
    }
  })

  return { ...result, ...lifecycle }
}

function normalizeOriginalOrder(value) {
  if (value === null || value === undefined) return null
  if (!isPlainObject(value)) throw new OrderValidationError('Invalid originalOrder')
  return cloneValue(value)
}

function hydrateCanonicalOrder(input) {
  if (!isPlainObject(input)) throw new OrderValidationError('Order must be a plain object')

  const result = normalizeCanonicalBooking(input)
  result.pricingOverrides = normalizePricingOverrides(input.pricingOverrides)
  result.originalOrder = normalizeOriginalOrder(input.originalOrder)
  return normalizeCanonicalLifecycle(input, result)
}

function assertOrderPatch(patch) {
  if (!isPlainObject(patch)) throw new OrderValidationError('updateData must be a plain object')

  for (const key of Object.keys(patch)) {
    if (key !== 'pricingOverrides' && !BOOKING_FIELDS.includes(key)) {
      throw new OrderValidationError(`Field is not editable: ${key}`)
    }
  }
}

function normalizePatchBoxes(value, currentBoxes) {
  if (value === null || value === undefined) return value
  return normalizeCurrentBoxes(value, currentBoxes)
}

function applyOrderPatch(currentOrder, patch) {
  if (!currentOrder || typeof currentOrder !== 'object' || Array.isArray(currentOrder)) {
    throw new OrderValidationError('Order must be an object')
  }
  assertOrderPatch(patch)

  let updated = currentOrder
  if (hasOwn(patch, 'pricingOverrides')) {
    updated = {
      ...updated,
      pricingOverrides: normalizePricingOverrides(patch.pricingOverrides),
    }
  }

  for (const field of BOOKING_FIELDS) {
    if (!hasOwn(patch, field)) continue

    const value = patch[field]
    if ((value === null || value === undefined) && !NULLABLE_BOOKING_FIELDS.has(field)) {
      throw new OrderValidationError(`Invalid ${field}`)
    }

    let nextValue = value
    if (field === 'date' && value !== null && value !== undefined) {
      nextValue = parseInstant(value, 'date')
    } else if (field === 'duration') {
      nextValue = normalizeDuration(value)
    } else if (field === 'boxes') {
      nextValue = normalizePatchBoxes(value, updated.boxes)
    } else if (field === 'address' || field === 'destination') {
      nextValue = normalizeAddressWithFallback(value, field, updated[field])
    } else if (field === 'service') {
      nextValue = normalizeEmbeddedWithFallback(value, field, 'pricePerHour', updated[field])
    } else if (field === 'paymentType') {
      nextValue = normalizeEmbeddedWithFallback(value, field, null, updated[field])
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(value)) throw new OrderValidationError('Invalid extraAddresses')
      nextValue = value.map((address, index) =>
        normalizeAddressWithFallback(address, `extraAddresses.${index}`, updated.extraAddresses?.[index]),
      )
    } else if (STRING_BOOKING_FIELDS.has(field) || BOOLEAN_BOOKING_FIELDS.has(field)) {
      nextValue = normalizeSimpleBookingField(field, value)
    }

    updated = { ...updated, [field]: cloneValue(nextValue) }
  }

  return updated
}

function updateOrderField(order, key, value) {
  return applyOrderPatch(order, { [key]: value })
}

function createDefaultAppOrder() {
  return makeDefaultState()
}

function constructBookingOrder(input, { validateSimpleFields = true } = {}) {
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
    else if (field === 'boxes') result.boxes = normalizeCurrentBoxes(input.boxes, defaults.boxes)
    else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new OrderValidationError('Invalid extraAddresses')
      result.extraAddresses = input.extraAddresses.map((address, index) =>
        normalizeAddressWithFallback(address, `extraAddresses.${index}`),
      )
    } else if (field === 'address' || field === 'destination') {
      result[field] = normalizeAddressWithFallback(input[field], field, result[field])
    } else if (field === 'service') {
      result[field] = normalizeEmbeddedWithFallback(input[field], field, 'pricePerHour')
    } else if (field === 'paymentType') {
      result[field] = normalizeEmbeddedWithFallback(input[field], field, null)
    } else if (
      validateSimpleFields &&
      (STRING_BOOKING_FIELDS.has(field) || BOOLEAN_BOOKING_FIELDS.has(field))
    ) {
      result[field] = normalizeSimpleBookingField(field, input[field])
    } else {
      result[field] = cloneValue(input[field])
    }
  })

  return result
}

function createAppOrder(input = {}) {
  if (!isPlainObject(input)) throw new OrderValidationError('Order must be an object')

  const order = constructBookingOrder(input)
  order.pricingOverrides = normalizePricingOverrides(input.pricingOverrides)
  return order
}

function createWordPressOrder(input = {}, originalOrder = input) {
  if (!isPlainObject(input)) throw new OrderValidationError('Order must be an object')
  if (!isPlainObject(originalOrder)) throw new OrderValidationError('Original WordPress order must be an object')

  const booking = constructBookingOrder(input, { validateSimpleFields: false })
  return {
    ...booking,
    originalOrder: cloneValue(originalOrder),
  }
}

export {
  BOOKING_FIELDS,
  CALENDAR_EVENT_ROLES,
  makeCalendarEventIds,
  createDefaultAppOrder,
  hydrateCanonicalOrder,
  createAppOrder,
  createWordPressOrder,
  applyOrderPatch,
  updateOrderField,
}
