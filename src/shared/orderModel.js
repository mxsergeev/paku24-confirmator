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

function normalizeSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid initialSnapshot')
  }

  const snapshot = {}

  SNAPSHOT_FIELDS.forEach((field) => {
    if (!hasOwn(value, field)) return

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

function normalizePricing(value, initialSnapshot) {
  if (value === null || value === undefined) return makePricing()
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

function normalizeLifecycleField(result, input, field) {
  if (!hasOwn(input, field) || input[field] === undefined) return

  if (field === 'confirmed' || field === 'markedForDeletion') {
    result[field] = Boolean(input[field])
  } else if (field.endsWith('At') || field === 'receivedAt') {
    result[field] = input[field] === null ? null : parseDateTime(input[field], field)
  } else {
    result[field] = cloneValue(input[field])
  }
}

function normalizeOrder(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Order must be an object')
  }

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
  }

  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(input, field) || input[field] === undefined) return

    if (field === 'date') {
      result.date = parseDateTime(input.date)
    } else if (field === 'boxes') {
      result.boxes = normalizeCurrentBoxes(input.boxes, defaults.boxes)
    } else if (field === 'extraAddresses') {
      if (!Array.isArray(input.extraAddresses)) throw new Error('Invalid extraAddresses')
      result.extraAddresses = cloneValue(input.extraAddresses)
    } else {
      result[field] = cloneValue(input[field])
    }
  })

  if (hasOwn(input, 'origin') && input.origin !== undefined) {
    if (!['app', 'wordpress'].includes(input.origin)) {
      throw new Error(`Invalid order origin: ${String(input.origin)}`)
    }
    result.origin = input.origin
  }

  if (hasOwn(input, 'initialSnapshot') && input.initialSnapshot !== undefined) {
    result.initialSnapshot = input.initialSnapshot === null ? null : normalizeSnapshot(input.initialSnapshot)
  }

  result.pricing = normalizePricing(input.pricing, result.initialSnapshot)

  LIFECYCLE_FIELDS.forEach((field) => normalizeLifecycleField(result, input, field))

  return materializeActivePricing(result)
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

function createAppOrder(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Order must be an object')
  }
  rejectClientSnapshot(input)

  return normalizeOrder({
    ...input,
    origin: 'app',
    initialSnapshot: null,
    pricing: makePricing(),
  })
}

function createWordPressOrder(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Order must be an object')
  }
  rejectClientSnapshot(input)

  const imported = importedPricingValues(input)
  const normalized = normalizeOrder({
    ...input,
    origin: 'wordpress',
    initialSnapshot: null,
    pricing: makePricing(),
  })
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
  return ['amount', 'deliveryDate', 'returnDate'].some(
    (field) => !sameValue(previous[field], next[field]),
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

function updateOrderField(order, key, value) {
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (!BOOKING_FIELDS.includes(key)) throw new Error(`Field is not editable: ${String(key)}`)

  let updated = {
    ...order,
    [key]: cloneValue(value),
  }

  if (key === 'boxes') {
    if (boxPricingFieldsChanged(order.boxes, value)) {
      updated = resetInitialPricing(updated, ['boxesPrice', 'price'])
    }
  } else if (RESET_AFTER_EDIT[key] && !sameValue(order[key], value)) {
    updated = resetInitialPricing(updated, RESET_AFTER_EDIT[key])
  }

  return materializeActivePricing(updated)
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

function defaultOrder() {
  return materializeActivePricing(makeDefaultState())
}

export {
  BOOKING_FIELDS,
  SNAPSHOT_FIELDS,
  LIFECYCLE_FIELDS,
  defaultOrder,
  normalizeOrder,
  createAppOrder,
  createWordPressOrder,
  updateOrderField,
  setPricingSource,
  setManualPricing,
  clearManualPricing,
  revertToInitial,
}
