import distances from '../data/distances.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import { isDateOnly, parseCalendarDate, parseInstant } from './date-fns-tz.js'
import {
  materializeActivePricing,
  normalizeFeeList,
  resolveActivePricing,
} from './orderPricing.js'
import {
  cloneValue,
  hasOwn,
  isPlainObject,
  OrderValidationError,
  ORDER_ORIGINS,
  PRICING_COMPONENTS,
  PRICING_SOURCES,
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

const SNAPSHOT_FIELDS = [
  'distance',
  'hsy',
  'XL',
  'eventColor',
  'date',
  'duration',
  'service',
  'paymentType',
  'fees',
  'boxes',
  'boxesPrice',
  'price',
  'address',
  'extraAddresses',
  'destination',
  'name',
  'email',
  'phone',
  'comment',
]

const RESET_AFTER_EDIT = {
  duration: ['price'],
  service: ['fees', 'price'],
  paymentType: ['fees', 'price'],
  date: ['fees', 'price'],
  address: ['fees', 'price'],
  destination: ['fees', 'price'],
  extraAddresses: ['fees', 'price'],
}

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

function isPresent(value) {
  return value !== null && value !== undefined
}

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

function makePricing() {
  return {
    source: {
      price: 'auto',
      fees: 'auto',
      boxesPrice: 'auto',
    },
    manual: {
      price: null,
      fees: null,
      boxesPrice: null,
    },
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
    origin: 'app',
    initialSnapshot: null,
    pricing: makePricing(),
    price: null,
    fees: [],
    boxesPrice: null,
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
    if (hasOwn(boxes, field)) {
      boxes[field] = normalizeBoxDate(boxes[field], `${fieldName}.${field}`)
    }
  }

  return boxes
}

function normalizeCurrentBoxes(value, fallback) {
  if (value === null) throw new OrderValidationError('Invalid boxes')

  const input = value === undefined ? {} : value
  const boxes = normalizeBoxesShape(input, 'boxes', fallback)
  if (!hasOwn(boxes, 'amount') || !hasOwn(boxes, 'deliveryDate') || !hasOwn(boxes, 'returnDate')) {
    throw new OrderValidationError('Invalid boxes')
  }
  return boxes
}

function normalizePricingValue(component, value, fieldName) {
  if (component === 'fees') {
    return normalizeFeeList(value, `Invalid ${fieldName}`).map((fee) => cloneValue(fee))
  }

  const number = toFiniteNumberOrNull(value)
  if (number === null) throw new OrderValidationError(`Invalid ${fieldName}`)
  return number
}

function normalizePricing(value, initialSnapshot, { requireComplete = false } = {}) {
  if (value === null || value === undefined) {
    if (requireComplete) throw new OrderValidationError('Invalid pricing: required')
    return makePricing()
  }
  if (typeof value !== 'object' || Array.isArray(value)) throw new OrderValidationError('Invalid pricing')

  const sourceInput = value.source
  if (
    sourceInput !== undefined &&
    (!sourceInput || typeof sourceInput !== 'object' || Array.isArray(sourceInput))
  ) {
    throw new OrderValidationError('Invalid pricing.source')
  }

  const manualInput = value.manual
  if (
    manualInput !== undefined &&
    (!manualInput || typeof manualInput !== 'object' || Array.isArray(manualInput))
  ) {
    throw new OrderValidationError('Invalid pricing.manual')
  }

  const pricing = makePricing()

  PRICING_COMPONENTS.forEach((component) => {
    if (requireComplete && !sourceInput) throw new OrderValidationError('Invalid pricing.source')
    if (requireComplete && !manualInput) throw new OrderValidationError('Invalid pricing.manual')

    if (requireComplete && !hasOwn(sourceInput, component)) {
      throw new OrderValidationError(`Invalid pricing.source.${component}: required`)
    }
    if (requireComplete && !hasOwn(manualInput, component)) {
      throw new OrderValidationError(`Invalid pricing.manual.${component}: required`)
    }

    const source = sourceInput && hasOwn(sourceInput, component) ? sourceInput[component] : 'auto'
    if (!PRICING_SOURCES.includes(source)) {
      throw new OrderValidationError(`Invalid pricing source for ${component}: ${String(source)}`)
    }
    pricing.source[component] = source

    const manualValue = manualInput && hasOwn(manualInput, component) ? manualInput[component] : null
    if (manualValue === null || manualValue === undefined) {
      pricing.manual[component] = null
    } else {
      pricing.manual[component] = normalizePricingValue(
        component,
        manualValue,
        `pricing.manual.${component}`,
      )
    }
  })

  PRICING_COMPONENTS.forEach((component) => {
    const source = pricing.source[component]
    if (source === 'initial') {
      const valueFromSnapshot = initialSnapshot?.[component]
      if (!isPresent(valueFromSnapshot)) {
        throw new OrderValidationError(`Cannot use initial ${component}: the snapshot value is missing`)
      }
    }

    if (source === 'manual' && pricing.manual[component] === null) {
      throw new OrderValidationError(`Cannot use manual ${component}: the manual value is missing`)
    }
  })

  return pricing
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

function stripAddressMetadata(value) {
  if (!isPlainObject(value)) return cloneValue(value)

  return Object.fromEntries(
    ['street', 'index', 'city', 'floor', 'elevator']
      .filter((field) => hasOwn(value, field))
      .map((field) => [field, cloneValue(value[field])]),
  )
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
    const nullableField = ['eventColor', 'name', 'email', 'phone', 'comment'].includes(field)
    const value = requireField(input, field, { allowNull: nullableField })
    const fieldName = fieldPrefix ? `${fieldPrefix}.${field}` : field

    if (field === 'date') {
      result[field] = parseInstant(value, fieldName)
    } else if (field === 'boxes') {
      result[field] = normalizeCanonicalBoxes(value, fieldName)
    } else if (field === 'address' || field === 'destination') {
      result[field] = normalizeCanonicalAddress(value, fieldName)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(value)) throw new OrderValidationError(`Invalid ${fieldName}`)
      result[field] = value.map((address, index) =>
        normalizeCanonicalAddress(address, `${fieldName}.${index}`),
      )
    } else if (field === 'duration') {
      const duration = toFiniteNumberOrNull(value)
      if (duration === null) throw new OrderValidationError(`Invalid ${fieldName}`)
      result[field] = duration
    } else if (['distance', 'name', 'email', 'phone', 'comment'].includes(field)) {
      if (value !== null && typeof value !== 'string') throw new OrderValidationError(`Invalid ${fieldName}`)
      result[field] = value
    } else if (field === 'eventColor') {
      if (value !== null && typeof value !== 'string') throw new OrderValidationError(`Invalid ${fieldName}`)
      result[field] = value
    } else if (field === 'hsy' || field === 'XL') {
      if (typeof value !== 'boolean') throw new OrderValidationError(`Invalid ${fieldName}`)
      result[field] = value
    } else {
      requireObject(value, fieldName)
      result[field] = cloneValue(value)
    }
  })

  return result
}

function normalizeCanonicalSnapshot(value) {
  if (!isPlainObject(value)) throw new OrderValidationError('Invalid initialSnapshot')

  // Snapshot booking fields use the exact same canonical shape as the current
  // order. Pricing fields remain optional because WordPress may not provide
  // every imported component.
  const booking = normalizeCanonicalBooking(value, 'initialSnapshot')
  return {
    ...booking,
    ...PRICING_COMPONENTS.reduce((result, component) => {
      if (hasOwn(value, component)) {
        result[component] = normalizePricingValue(
          component,
          value[component],
          `initialSnapshot.${component}`,
        )
      }
      return result
    }, {}),
  }
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

/**
 * Hydrate a complete order returned by the API or persistence layer.
 *
 * Unlike the creation functions this intentionally has no booking defaults:
 * a missing date, service, address, or boxes value is malformed persisted
 * state, not a request to start a new order today.
 */
function hydrateCanonicalOrder(input) {
  if (!isPlainObject(input)) throw new OrderValidationError('Order must be a plain object')

  const result = normalizeCanonicalBooking(input)
  const origin = requireField(input, 'origin')
  if (!ORDER_ORIGINS.includes(origin)) {
    throw new OrderValidationError(`Invalid order origin: ${String(origin)}`)
  }

  if (!hasOwn(input, 'initialSnapshot')) {
    throw new OrderValidationError('Invalid order: initialSnapshot is required')
  }
  if (origin === 'app' && input.initialSnapshot !== null) {
    throw new OrderValidationError('Invalid order: app orders cannot have an initialSnapshot')
  }
  if (origin === 'wordpress' && input.initialSnapshot === null) {
    throw new OrderValidationError('Invalid order: WordPress orders require an initialSnapshot')
  }

  result.origin = origin
  result.initialSnapshot =
    input.initialSnapshot === null ? null : normalizeCanonicalSnapshot(input.initialSnapshot)
  result.pricing = normalizePricing(input.pricing, result.initialSnapshot, { requireComplete: true })

  return materializeActivePricing(normalizeCanonicalLifecycle(input, result))
}

function rejectClientSnapshot(input) {
  if (hasOwn(input, 'initialSnapshot') && input.initialSnapshot !== null && input.initialSnapshot !== undefined) {
    throw new OrderValidationError('initialSnapshot is server-managed and cannot be supplied')
  }
}

function snapshotFromOrder(order, importedPricing = {}) {
  const snapshot = {}

  SNAPSHOT_FIELDS.forEach((field) => {
    if (field === 'price' || field === 'fees' || field === 'boxesPrice') return
    snapshot[field] = cloneValue(order[field])
  })

  PRICING_COMPONENTS.forEach((component) => {
    if (!hasOwn(importedPricing, component)) return
    snapshot[component] = cloneValue(importedPricing[component])
  })

  return snapshot
}

function importedPricingValues(input) {
  const imported = {}

  PRICING_COMPONENTS.forEach((component) => {
    if (!hasOwn(input, component) || !isPresent(input[component])) return
    imported[component] = normalizePricingValue(component, input[component], component)
  })

  return imported
}

function constructBookingOrder(input, origin) {
  const defaults = makeDefaultState()
  const result = {
    ...defaults,
    service: cloneValue(defaults.service),
    paymentType: cloneValue(defaults.paymentType),
    address: cloneValue(defaults.address),
    extraAddresses: [],
    destination: cloneValue(defaults.destination),
    boxes: cloneValue(defaults.boxes),
    pricing: makePricing(),
    origin,
    initialSnapshot: null,
  }

  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === undefined) return

    if (field === 'date') {
      result.date = parseInstant(input.date, 'date')
    } else if (field === 'boxes') {
      result.boxes = normalizeCurrentBoxes(input.boxes, defaults.boxes)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new OrderValidationError('Invalid extraAddresses')
      result.extraAddresses = input.extraAddresses.map(stripAddressMetadata)
    } else if (field === 'address' || field === 'destination') {
      result[field] = stripAddressMetadata(input[field])
    } else {
      result[field] = cloneValue(input[field])
    }
  })

  return result
}

function createAppOrder(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OrderValidationError('Order must be an object')
  }
  rejectClientSnapshot(input)

  return materializeActivePricing(constructBookingOrder(input, 'app'))
}

function createWordPressOrder(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OrderValidationError('Order must be an object')
  }
  rejectClientSnapshot(input)

  const imported = importedPricingValues(input)
  const booking = constructBookingOrder(input, 'wordpress')
  const snapshot = snapshotFromOrder(booking, imported)
  const source = {
    price: hasOwn(imported, 'price') ? 'initial' : 'auto',
    fees: hasOwn(imported, 'fees') ? 'initial' : 'auto',
    boxesPrice: hasOwn(imported, 'boxesPrice') ? 'initial' : 'auto',
  }

  return materializeActivePricing({
    ...booking,
    origin: 'wordpress',
    initialSnapshot: snapshot,
    pricing: {
      source,
      manual: {
        price: null,
        fees: null,
        boxesPrice: null,
      },
    },
  })
}

function sameValue(left, right) {
  if (Object.is(left, right)) return true
  if (left === null || left === undefined || right === null || right === undefined) return false
  return JSON.stringify(left) === JSON.stringify(right)
}

function boxPricingFieldsChanged(previous = {}, next = {}) {
  const previousBoxes = previous || {}
  const nextBoxes = next || {}

  return ['amount', 'deliveryDate', 'returnDate'].some(
    (field) => !sameValue(previousBoxes[field], nextBoxes[field]),
  )
}

function resetInitialPricing(order, components) {
  const sourceChanges = {}

  components.forEach((component) => {
    if (order.pricing.source[component] === 'initial') sourceChanges[component] = 'auto'
  })

  if (Object.keys(sourceChanges).length === 0) return order

  return {
    ...order,
    pricing: {
      ...order.pricing,
      source: {
        ...order.pricing.source,
        ...sourceChanges,
      },
    },
  }
}

function assertOrderPatch(patch) {
  if (!isPlainObject(patch)) throw new OrderValidationError('updateData must be a plain object')

  for (const key of Object.keys(patch)) {
    if (key !== 'pricing' && !BOOKING_FIELDS.includes(key)) {
      throw new OrderValidationError(`Field is not editable: ${key}`)
    }
  }
}

function normalizePatchBoxes(value, currentBoxes) {
  if (value === null || value === undefined) return value

  if (!isPlainObject(value)) {
    throw new OrderValidationError('Invalid boxes')
  }

  return normalizeCurrentBoxes(value, currentBoxes)
}

/**
 * Apply an update patch to an already canonical order.
 *
 * Pricing is intentionally applied before booking fields. This lets a patch
 * which selects an initial source and edits a dependent booking field retain
 * the existing transition semantics: only components still using `initial`
 * are moved to `auto`. Active pricing is resolved once, from the final state.
 */
function applyOrderPatch(currentOrder, patch) {
  if (!currentOrder || typeof currentOrder !== 'object' || Array.isArray(currentOrder)) {
    throw new OrderValidationError('Order must be an object')
  }
  assertOrderPatch(patch)

  let updated = currentOrder

  if (hasOwn(patch, 'pricing')) {
    const pricing = patch.pricing
    if (!isPlainObject(pricing)) throw new OrderValidationError('pricing must be a plain object')
    if (!isPlainObject(pricing.source)) {
      throw new OrderValidationError('pricing.source must be a plain object')
    }
    if (!isPlainObject(pricing.manual)) {
      throw new OrderValidationError('pricing.manual must be a plain object')
    }

    PRICING_COMPONENTS.forEach((component) => {
      if (!hasOwn(pricing.source, component)) {
        throw new OrderValidationError(`pricing.source.${component} is required`)
      }
      if (!hasOwn(pricing.manual, component)) {
        throw new OrderValidationError(`pricing.manual.${component} is required`)
      }
    })

    updated = {
      ...updated,
      pricing: normalizePricing(pricing, updated.initialSnapshot),
    }
  }

  for (const field of BOOKING_FIELDS) {
    if (!hasOwn(patch, field)) continue

    const value = patch[field]
    let nextValue = value

    if (field === 'date' && value !== null && value !== undefined) {
      nextValue = parseInstant(value, 'date')
    } else if (field === 'boxes') {
      nextValue = normalizePatchBoxes(value, updated.boxes)
    }

    const previousValue = updated[field]
    updated = {
      ...updated,
      [field]: cloneValue(nextValue),
    }

    if (field === 'boxes') {
      if (boxPricingFieldsChanged(previousValue, nextValue)) {
        updated = resetInitialPricing(updated, ['boxesPrice', 'price'])
      }
    } else if (RESET_AFTER_EDIT[field] && !sameValue(previousValue, nextValue)) {
      updated = resetInitialPricing(updated, RESET_AFTER_EDIT[field])
    }
  }

  return materializeActivePricing(updated)
}

function updateOrderField(order, key, value) {
  return applyOrderPatch(order, { [key]: value })
}

function setManualPricing(order, component, value) {
  if (!order || typeof order !== 'object') throw new OrderValidationError('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new OrderValidationError(`Unknown pricing component: ${String(component)}`)
  }

  const normalizedValue = normalizePricingValue(component, value, `pricing.manual.${component}`)
  const source = {
    ...order.pricing.source,
    [component]: 'manual',
  }

  if (component !== 'price' && source.price === 'initial') source.price = 'auto'

  const updated = {
    ...order,
    pricing: {
      ...order.pricing,
      source,
      manual: {
        ...order.pricing.manual,
        [component]: normalizedValue,
      },
    },
  }

  return materializeActivePricing(updated)
}

function clearManualPricing(order, component) {
  if (!order || typeof order !== 'object') throw new OrderValidationError('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new OrderValidationError(`Unknown pricing component: ${String(component)}`)
  }

  const updated = {
    ...order,
    pricing: {
      ...order.pricing,
      source: {
        ...order.pricing.source,
        [component]: 'auto',
      },
      manual: {
        ...order.pricing.manual,
        [component]: null,
      },
    },
  }
  return materializeActivePricing(updated)
}

function setPricingSource(order, component, source) {
  if (!order || typeof order !== 'object') throw new OrderValidationError('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new OrderValidationError(`Unknown pricing component: ${String(component)}`)
  }
  if (!PRICING_SOURCES.includes(source)) {
    throw new OrderValidationError(`Invalid pricing source for ${component}: ${String(source)}`)
  }

  if (source === 'initial') {
    const value = order.initialSnapshot?.[component]
    if (!isPresent(value)) {
      throw new OrderValidationError(`Cannot use initial ${component}: the snapshot value is missing`)
    }
    normalizePricingValue(component, value, `initialSnapshot.${component}`)
  }

  if (source === 'manual' && order.pricing?.manual?.[component] === null) {
    throw new OrderValidationError(`Cannot use manual ${component}: the manual value is missing`)
  }

  const updated = {
    ...order,
    pricing: {
      ...order.pricing,
      source: {
        ...order.pricing.source,
        [component]: source,
      },
    },
  }
  return materializeActivePricing(updated)
}

function revertToInitial(order) {
  if (!order || typeof order !== 'object') throw new OrderValidationError('Order must be an object')
  if (order.origin === 'app' || !order.initialSnapshot) {
    throw new OrderValidationError('App-created orders do not have an initial snapshot to revert to')
  }

  const snapshot = order.initialSnapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new OrderValidationError('Invalid initialSnapshot')
  }

  const restored = { ...order }
  SNAPSHOT_FIELDS.forEach((field) => {
    if (hasOwn(snapshot, field)) restored[field] = cloneValue(snapshot[field])
  })

  restored.initialSnapshot = order.initialSnapshot
  restored.pricing = {
    source: {
      price: isPresent(snapshot.price) ? 'initial' : 'auto',
      fees: isPresent(snapshot.fees) ? 'initial' : 'auto',
      boxesPrice: isPresent(snapshot.boxesPrice) ? 'initial' : 'auto',
    },
    manual: {
      price: null,
      fees: null,
      boxesPrice: null,
    },
  }

  const active = resolveActivePricing(restored)
  restored.price = cloneValue(active.price)
  restored.fees = cloneValue(active.fees)
  restored.boxesPrice = cloneValue(active.boxesPrice)
  return restored
}

function createDefaultAppOrder() {
  return materializeActivePricing(makeDefaultState())
}

export {
  BOOKING_FIELDS,
  SNAPSHOT_FIELDS,
  CALENDAR_EVENT_ROLES,
  makeCalendarEventIds,
  createDefaultAppOrder,
  hydrateCanonicalOrder,
  createAppOrder,
  createWordPressOrder,
  applyOrderPatch,
  updateOrderField,
  setPricingSource,
  setManualPricing,
  clearManualPricing,
  revertToInitial,
}
