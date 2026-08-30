import distances from '../data/distances.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import { isDateOnly, parseDateOnly, parseDateTime } from './date-fns-tz.js'
import {
  materializeActivePricing,
  normalizeFeeList,
  resolveActivePricing,
} from './orderPricing.js'

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

const PRICING_COMPONENTS = ['price', 'fees', 'boxesPrice']
const PRICING_SOURCES = ['initial', 'auto', 'manual']

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
  '_id',
  'confirmed',
  'confirmedBy',
  'confirmedAt',
  'receivedAt',
  'canceledAt',
  'deletedAt',
  'markedForDeletion',
  'invoiceNumber',
  'googleEventId',
]

function cloneValue(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (Array.isArray(value)) return value.map((item) => cloneValue(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }

  return value
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function finiteNumber(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function isPresent(value) {
  return value !== null && value !== undefined
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
      pricePerHour: finiteNumber(service.pricePerHour) ?? 0,
    },
    paymentType: {
      ...cloneValue(paymentType),
      fee: finiteNumber(paymentType.fee) ?? 0,
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
    _id: null,
    confirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    receivedAt: null,
    canceledAt: null,
    deletedAt: null,
    markedForDeletion: false,
    invoiceNumber: null,
    googleEventId: null,
  }
}

function normalizeBoxDate(value, fieldName) {
  if (isDateOnly(value)) {
    parseDateOnly(value, fieldName)
    return value
  }

  return parseDateTime(value, fieldName)
}

function normalizeCurrentBoxes(value, fallback) {
  if (value === null) throw new Error('Invalid boxes')

  const input = value === undefined ? {} : value
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid boxes')
  }

  const boxes = {
    ...cloneValue(fallback),
    ...cloneValue(input),
  }

  const amount = finiteNumber(boxes.amount)
  if (amount === null || amount < 0) throw new Error('Invalid boxes.amount')
  boxes.amount = amount

  if (hasOwn(input, 'deliveryDate')) {
    boxes.deliveryDate = normalizeBoxDate(input.deliveryDate, 'boxes.deliveryDate')
  }

  if (hasOwn(input, 'returnDate')) {
    boxes.returnDate = normalizeBoxDate(input.returnDate, 'boxes.returnDate')
  }

  return boxes
}

function normalizeSnapshotBoxes(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid initialSnapshot.boxes')
  }

  for (const field of ['deliveryDate', 'returnDate', 'amount']) {
    if (!hasOwn(value, field) || value[field] === null || value[field] === undefined) {
      throw new Error(`Invalid initialSnapshot.boxes: ${field} is required`)
    }
  }

  const amount = finiteNumber(value.amount)
  if (amount === null || amount < 0) {
    throw new Error('Invalid initialSnapshot.boxes: amount must be finite and non-negative')
  }

  return {
    ...cloneValue(value),
    deliveryDate: normalizeBoxDate(value.deliveryDate, 'initialSnapshot.boxes.deliveryDate'),
    returnDate: normalizeBoxDate(value.returnDate, 'initialSnapshot.boxes.returnDate'),
    amount,
  }
}

function normalizePricingValue(component, value, fieldName) {
  if (component === 'fees') {
    return normalizeFeeList(value, `Invalid ${fieldName}`).map((fee) => cloneValue(fee))
  }

  const number = finiteNumber(value)
  if (number === null) throw new Error(`Invalid ${fieldName}`)
  return number
}

function normalizeSnapshot(value, { requireBooking = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid initialSnapshot')
  }

  const snapshot = {}

  SNAPSHOT_FIELDS.forEach((field) => {
    if (!hasOwn(value, field)) {
      if (requireBooking && !PRICING_COMPONENTS.includes(field)) {
        throw new Error(`Invalid initialSnapshot: ${field} is required`)
      }
      return
    }

    if (requireBooking && !PRICING_COMPONENTS.includes(field) && value[field] === undefined) {
      throw new Error(`Invalid initialSnapshot.${field}`)
    }

    if (field === 'date') {
      snapshot.date = parseDateTime(value.date, 'initialSnapshot.date')
    } else if (field === 'boxes') {
      snapshot.boxes = normalizeSnapshotBoxes(value.boxes)
    } else if (field === 'fees' || field === 'price' || field === 'boxesPrice') {
      snapshot[field] = normalizePricingValue(field, value[field], `initialSnapshot.${field}`)
    } else {
      snapshot[field] = cloneValue(value[field])
    }
  })

  return snapshot
}

function normalizePricing(value, initialSnapshot, { requireComplete = false } = {}) {
  if (value === null || value === undefined) {
    if (requireComplete) throw new Error('Invalid pricing: required')
    return makePricing()
  }
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid pricing')

  const sourceInput = value.source
  if (
    sourceInput !== undefined &&
    (!sourceInput || typeof sourceInput !== 'object' || Array.isArray(sourceInput))
  ) {
    throw new Error('Invalid pricing.source')
  }

  const manualInput = value.manual
  if (
    manualInput !== undefined &&
    (!manualInput || typeof manualInput !== 'object' || Array.isArray(manualInput))
  ) {
    throw new Error('Invalid pricing.manual')
  }

  const pricing = makePricing()

  PRICING_COMPONENTS.forEach((component) => {
    if (requireComplete && !sourceInput) throw new Error('Invalid pricing.source')
    if (requireComplete && !manualInput) throw new Error('Invalid pricing.manual')

    if (requireComplete && !hasOwn(sourceInput, component)) {
      throw new Error(`Invalid pricing.source.${component}: required`)
    }
    if (requireComplete && !hasOwn(manualInput, component)) {
      throw new Error(`Invalid pricing.manual.${component}: required`)
    }

    const source = sourceInput && hasOwn(sourceInput, component) ? sourceInput[component] : 'auto'
    if (!PRICING_SOURCES.includes(source)) {
      throw new Error(`Invalid pricing source for ${component}: ${String(source)}`)
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
        throw new Error(`Cannot use initial ${component}: the snapshot value is missing`)
      }
      normalizePricingValue(component, valueFromSnapshot, `initialSnapshot.${component}`)
    }

    if (source === 'manual' && pricing.manual[component] === null) {
      throw new Error(`Cannot use manual ${component}: the manual value is missing`)
    }
  })

  return pricing
}

function defaultLifecycleState() {
  return {
    id: null,
    _id: null,
    confirmed: false,
    confirmedBy: null,
    confirmedAt: null,
    receivedAt: null,
    canceledAt: null,
    deletedAt: null,
    markedForDeletion: false,
    invoiceNumber: null,
    googleEventId: null,
  }
}

function requireField(input, field, { allowNull = false } = {}) {
  if (!hasOwn(input, field) || input[field] === undefined || (!allowNull && input[field] === null)) {
    throw new Error(`Invalid order: ${field} is required`)
  }
  return input[field]
}

function requireObject(value, field) {
  if (!isPlainObject(value)) throw new Error(`Invalid ${field}`)
  return value
}

function normalizeCanonicalAddress(value, field) {
  requireObject(value, field)
  for (const key of ['street', 'index', 'city', 'floor', 'elevator']) {
    if (!hasOwn(value, key) || value[key] === undefined || value[key] === null) {
      throw new Error(`Invalid ${field}.${key}: required`)
    }
  }
  if (typeof value.street !== 'string') throw new Error(`Invalid ${field}.street`)
  if (typeof value.index !== 'string') throw new Error(`Invalid ${field}.index`)
  if (typeof value.city !== 'string') throw new Error(`Invalid ${field}.city`)

  const floor = finiteNumber(value.floor)
  if (floor === null) throw new Error(`Invalid ${field}.floor`)
  if (typeof value.elevator !== 'boolean') throw new Error(`Invalid ${field}.elevator`)

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
      throw new Error(`Invalid ${field}.${key}: required`)
    }
  }

  const amount = finiteNumber(value.amount)
  if (amount === null || amount < 0) throw new Error(`Invalid ${field}.amount`)

  return {
    ...cloneValue(value),
    deliveryDate: normalizeBoxDate(value.deliveryDate, `${field}.deliveryDate`),
    returnDate: normalizeBoxDate(value.returnDate, `${field}.returnDate`),
    amount,
  }
}

function normalizeCanonicalBooking(input, fieldPrefix = '') {
  const result = {}

  BOOKING_FIELDS.forEach((field) => {
    const nullableField = ['eventColor', 'name', 'email', 'phone', 'comment'].includes(field)
    const value = requireField(input, field, { allowNull: nullableField })
    const fieldName = fieldPrefix ? `${fieldPrefix}.${field}` : field

    if (field === 'date') {
      result[field] = parseDateTime(value, fieldName)
    } else if (field === 'boxes') {
      result[field] = normalizeCanonicalBoxes(value, fieldName)
    } else if (field === 'address' || field === 'destination') {
      result[field] = normalizeCanonicalAddress(value, fieldName)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(value)) throw new Error(`Invalid ${fieldName}`)
      result[field] = value.map((address, index) =>
        normalizeCanonicalAddress(address, `${fieldName}.${index}`),
      )
    } else if (field === 'duration') {
      const duration = finiteNumber(value)
      if (duration === null) throw new Error(`Invalid ${fieldName}`)
      result[field] = duration
    } else if (['distance', 'name', 'email', 'phone', 'comment'].includes(field)) {
      if (value !== null && typeof value !== 'string') throw new Error(`Invalid ${fieldName}`)
      result[field] = value
    } else if (field === 'eventColor') {
      if (value !== null && typeof value !== 'string') throw new Error(`Invalid ${fieldName}`)
      result[field] = value
    } else if (field === 'hsy' || field === 'XL') {
      if (typeof value !== 'boolean') throw new Error(`Invalid ${fieldName}`)
      result[field] = value
    } else {
      requireObject(value, fieldName)
      result[field] = cloneValue(value)
    }
  })

  return result
}

function normalizeCanonicalSnapshot(value) {
  const snapshot = normalizeSnapshot(value, { requireBooking: true })

  // Snapshot booking fields use the exact same canonical shape as the current
  // order. Pricing fields remain optional because WordPress may not provide
  // every imported component.
  const booking = normalizeCanonicalBooking(snapshot, 'initialSnapshot')
  return {
    ...booking,
    ...PRICING_COMPONENTS.reduce((result, component) => {
      if (hasOwn(snapshot, component)) result[component] = snapshot[component]
      return result
    }, {}),
  }
}

function normalizeCanonicalLifecycle(input, result) {
  const lifecycle = defaultLifecycleState()

  LIFECYCLE_FIELDS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === undefined) return

    if (field === 'confirmed' || field === 'markedForDeletion') {
      if (typeof input[field] !== 'boolean') throw new Error(`Invalid ${field}`)
      lifecycle[field] = input[field]
    } else if (field.endsWith('At') || field === 'receivedAt') {
      lifecycle[field] = input[field] === null ? null : parseDateTime(input[field], field)
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
  if (!isPlainObject(input)) throw new Error('Order must be a plain object')

  const result = normalizeCanonicalBooking(input)
  const origin = requireField(input, 'origin')
  if (!['app', 'wordpress'].includes(origin)) {
    throw new Error(`Invalid order origin: ${String(origin)}`)
  }

  if (!hasOwn(input, 'initialSnapshot')) {
    throw new Error('Invalid order: initialSnapshot is required')
  }
  if (origin === 'app' && input.initialSnapshot !== null) {
    throw new Error('Invalid order: app orders cannot have an initialSnapshot')
  }
  if (origin === 'wordpress' && input.initialSnapshot === null) {
    throw new Error('Invalid order: WordPress orders require an initialSnapshot')
  }

  result.origin = origin
  result.initialSnapshot =
    input.initialSnapshot === null ? null : normalizeCanonicalSnapshot(input.initialSnapshot)
  result.pricing = normalizePricing(input.pricing, result.initialSnapshot, { requireComplete: true })

  return materializeActivePricing(normalizeCanonicalLifecycle(input, result))
}

// Kept as a public compatibility name. New callers should use the explicit
// hydrateCanonicalOrder name so construction and hydration cannot be confused.
function normalizeOrder(input) {
  return hydrateCanonicalOrder(input)
}

function rejectClientSnapshot(input) {
  if (hasOwn(input, 'initialSnapshot') && input.initialSnapshot !== null && input.initialSnapshot !== undefined) {
    throw new Error('initialSnapshot is server-managed and cannot be supplied')
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
      result.date = parseDateTime(input.date, 'date')
    } else if (field === 'boxes') {
      result.boxes = normalizeCurrentBoxes(input.boxes, defaults.boxes)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new Error('Invalid extraAddresses')
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
    throw new Error('Order must be an object')
  }
  rejectClientSnapshot(input)

  return materializeActivePricing(constructBookingOrder(input, 'app'))
}

function createWordPressOrder(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Order must be an object')
  }
  rejectClientSnapshot(input)

  const imported = importedPricingValues(input)
  const normalized = materializeActivePricing(constructBookingOrder(input, 'wordpress'))
  const snapshot = snapshotFromOrder(normalized, imported)
  const source = {
    price: hasOwn(imported, 'price') ? 'initial' : 'auto',
    fees: hasOwn(imported, 'fees') ? 'initial' : 'auto',
    boxesPrice: hasOwn(imported, 'boxesPrice') ? 'initial' : 'auto',
  }

  return materializeActivePricing({
    ...normalized,
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
  if (!isPlainObject(patch)) throw new Error('updateData must be a plain object')

  for (const key of Object.keys(patch)) {
    if (key !== 'pricing' && !BOOKING_FIELDS.includes(key)) {
      throw new Error(`Field is not editable: ${key}`)
    }
  }
}

function normalizePatchBoxes(value, currentBoxes) {
  if (value === null || value === undefined) return value

  if (!isPlainObject(value)) {
    throw new Error('Invalid boxes')
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
    throw new Error('Order must be an object')
  }
  assertOrderPatch(patch)

  let updated = currentOrder

  if (hasOwn(patch, 'pricing')) {
    const pricing = patch.pricing
    if (!isPlainObject(pricing)) throw new Error('pricing must be a plain object')
    if (!isPlainObject(pricing.source)) {
      throw new Error('pricing.source must be a plain object')
    }
    if (!isPlainObject(pricing.manual)) {
      throw new Error('pricing.manual must be a plain object')
    }

    PRICING_COMPONENTS.forEach((component) => {
      if (!hasOwn(pricing.source, component)) {
        throw new Error(`pricing.source.${component} is required`)
      }
      if (!hasOwn(pricing.manual, component)) {
        throw new Error(`pricing.manual.${component} is required`)
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
      nextValue = parseDateTime(value, 'date')
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
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new Error(`Unknown pricing component: ${String(component)}`)
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
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new Error(`Unknown pricing component: ${String(component)}`)
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
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new Error(`Unknown pricing component: ${String(component)}`)
  }
  if (!PRICING_SOURCES.includes(source)) {
    throw new Error(`Invalid pricing source for ${component}: ${String(source)}`)
  }

  if (source === 'initial') {
    const value = order.initialSnapshot?.[component]
    if (!isPresent(value)) {
      throw new Error(`Cannot use initial ${component}: the snapshot value is missing`)
    }
    normalizePricingValue(component, value, `initialSnapshot.${component}`)
  }

  if (source === 'manual' && order.pricing?.manual?.[component] === null) {
    throw new Error(`Cannot use manual ${component}: the manual value is missing`)
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
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (order.origin === 'app' || !order.initialSnapshot) {
    throw new Error('App-created orders do not have an initial snapshot to revert to')
  }

  const snapshot = order.initialSnapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Invalid initialSnapshot')
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

function defaultOrder() {
  return createDefaultAppOrder()
}

export {
  BOOKING_FIELDS,
  SNAPSHOT_FIELDS,
  LIFECYCLE_FIELDS,
  createDefaultAppOrder,
  defaultOrder,
  hydrateCanonicalOrder,
  normalizeOrder,
  createAppOrder,
  createWordPressOrder,
  applyOrderPatch,
  updateOrderField,
  setPricingSource,
  setManualPricing,
  clearManualPricing,
  revertToInitial,
}
