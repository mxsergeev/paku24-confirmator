import {
  BOOKING_FIELDS,
  normalizeOrder,
  SNAPSHOT_FIELDS,
} from './orderModel.js'
import { resolveActivePricing } from './orderPricing.js'
import { isDateOnly, parseDateOnly, parseDateTime } from './date-fns-tz.js'

const DRAFT_VERSION = 1
const PRICING_COMPONENTS = ['price', 'fees', 'boxesPrice']
const PRICING_SOURCES = ['initial', 'auto', 'manual']
const VALID_ORIGINS = ['app', 'wordpress']
const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i
const ADDRESS_FIELDS = ['street', 'index', 'city', 'floor', 'elevator']

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function cloneValue(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (Array.isArray(value)) return value.map((item) => cloneValue(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }

  return value
}

function serializeAddress(value) {
  if (!isPlainObject(value)) return cloneValue(value)

  return Object.fromEntries(
    ADDRESS_FIELDS.filter((field) => hasOwn(value, field)).map((field) => [
      field,
      cloneValue(value[field]),
    ]),
  )
}

function serializeExtraAddresses(value) {
  if (!Array.isArray(value)) return cloneValue(value)
  return value.map((address) => serializeAddress(address))
}

function serializeDateTime(value, fieldName) {
  if (typeof value === 'string' && !TIMEZONE_SUFFIX.test(value)) {
    throw new Error(`Invalid ${fieldName}: expected an absolute instant`)
  }
  return parseDateTime(value, fieldName).toISOString()
}

function serializeBoxDate(value, fieldName) {
  if (isDateOnly(value)) {
    parseDateOnly(value, fieldName)
    return value
  }

  return serializeDateTime(value, fieldName)
}

function serializeBoxes(value, fieldName) {
  if (!isPlainObject(value)) throw new Error(`Invalid ${fieldName}`)

  const boxes = cloneValue(value)
  for (const field of ['deliveryDate', 'returnDate']) {
    if (hasOwn(value, field)) {
      boxes[field] = serializeBoxDate(value[field], `${fieldName}.${field}`)
    }
  }
  return boxes
}

function serializeBookingFields(order) {
  const result = {}

  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(order, field)) return

    if (field === 'date') result.date = serializeDateTime(order.date, 'date')
    else if (field === 'boxes') result.boxes = serializeBoxes(order.boxes, 'boxes')
    else if (field === 'address' || field === 'destination') {
      result[field] = serializeAddress(order[field])
    } else if (field === 'extraAddresses') {
      result.extraAddresses = serializeExtraAddresses(order.extraAddresses)
    } else result[field] = cloneValue(order[field])
  })

  return result
}

function serializeSnapshot(value) {
  if (value === null) return null
  if (!isPlainObject(value)) throw new Error('Invalid initialSnapshot')

  const result = {}
  SNAPSHOT_FIELDS.forEach((field) => {
    if (!hasOwn(value, field)) return

    if (field === 'date') result.date = serializeDateTime(value.date, 'initialSnapshot.date')
    else if (field === 'boxes') {
      result.boxes = serializeBoxes(value.boxes, 'initialSnapshot.boxes')
    } else if (field === 'address' || field === 'destination') {
      result[field] = serializeAddress(value[field])
    } else if (field === 'extraAddresses') {
      result.extraAddresses = serializeExtraAddresses(value.extraAddresses)
    } else {
      result[field] = cloneValue(value[field])
    }
  })

  return result
}

function serializePricing(value, fieldName = 'pricing') {
  if (!isPlainObject(value)) throw new Error(`Invalid ${fieldName}`)

  if (!isPlainObject(value.source)) throw new Error(`Invalid ${fieldName}.source`)
  if (!isPlainObject(value.manual)) throw new Error(`Invalid ${fieldName}.manual`)

  PRICING_COMPONENTS.forEach((component) => {
    if (!PRICING_SOURCES.includes(value.source[component])) {
      throw new Error(`Invalid ${fieldName}.source.${component}`)
    }
    if (!hasOwn(value.manual, component)) {
      throw new Error(`Invalid ${fieldName}.manual.${component}`)
    }
    if (value.source[component] === 'manual' && value.manual[component] === null) {
      throw new Error(`Invalid ${fieldName}.manual.${component}`)
    }
  })

  return {
    source: Object.fromEntries(
      PRICING_COMPONENTS.map((component) => [component, cloneValue(value.source[component])]),
    ),
    manual: Object.fromEntries(
      PRICING_COMPONENTS.map((component) => [component, cloneValue(value.manual[component])]),
    ),
  }
}

function requireOrigin(order) {
  if (!VALID_ORIGINS.includes(order?.origin)) {
    throw new Error(`Invalid order origin: ${String(order?.origin)}`)
  }
  return order.origin
}

function extractDraftOrder(order) {
  if (!isPlainObject(order)) throw new Error('Invalid draft order')

  if (!hasOwn(order, 'origin')) throw new Error('Invalid draft order: origin is required')
  if (!hasOwn(order, 'initialSnapshot')) {
    throw new Error('Invalid draft order: initialSnapshot is required')
  }
  if (!hasOwn(order, 'pricing')) throw new Error('Invalid draft order: pricing is required')

  const result = serializeBookingFields(order)
  result.origin = requireOrigin(order)
  result.initialSnapshot = serializeSnapshot(order.initialSnapshot)
  if (result.origin === 'app' && result.initialSnapshot !== null) {
    throw new Error('Invalid draft order: app orders cannot have an initialSnapshot')
  }
  if (result.origin === 'wordpress' && result.initialSnapshot === null) {
    throw new Error('Invalid draft order: WordPress orders require an initialSnapshot')
  }
  result.pricing = serializePricing(order.pricing)
  return result
}

function serializeDraft(order) {
  const serialized = extractDraftOrder(order)

  return {
    version: DRAFT_VERSION,
    order: serialized,
  }
}

function deserializeDraft(payload) {
  if (!isPlainObject(payload)) throw new Error('Invalid draft payload')
  if (payload.version !== DRAFT_VERSION) {
    throw new Error(`Unsupported draft version: ${String(payload.version)}`)
  }
  if (!isPlainObject(payload.order)) throw new Error('Invalid draft payload: order is required')

  // Selecting the draft fields also ensures lifecycle and materialized projections
  // supplied by stale or hand-edited drafts never become hydrated order state.
  return normalizeOrder(extractDraftOrder(payload.order))
}

function toCreateOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')
  if (requireOrigin(order) !== 'app') {
    throw new Error('Only app-origin orders can be created with this payload')
  }

  return {
    ...serializeBookingFields(order),
    origin: 'app',
  }
}

function toUpdateOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  return {
    ...serializeBookingFields(order),
    pricing: serializePricing(order.pricing),
  }
}

function toCommunicationOrder(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  const activePricing = resolveActivePricing(order)
  return {
    ...serializeBookingFields(order),
    price: cloneValue(activePricing.price),
    fees: cloneValue(activePricing.fees),
    boxesPrice: cloneValue(activePricing.boxesPrice),
  }
}

export {
  serializeDraft,
  deserializeDraft,
  toCreateOrderPayload,
  toUpdateOrderPayload,
  toCommunicationOrder,
}
