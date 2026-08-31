import { BOOKING_FIELDS, hydrateCanonicalOrder } from './orderModel.js'
import { getOrderPricing, normalizeFeeList } from './orderPricing.js'
import { isDateOnly, parseCalendarDate, parseInstant } from './date-fns-tz.js'
import { cloneValue, hasOwn, isPlainObject, PRICING_COMPONENTS, toFiniteNumberOrNull } from './orderPrimitives.js'

const DRAFT_VERSION = 2
const ADDRESS_FIELDS = ['street', 'index', 'city', 'floor', 'elevator']

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
  return parseInstant(value, fieldName).toISOString()
}

function serializeBoxDate(value, fieldName) {
  if (isDateOnly(value)) {
    parseCalendarDate(value, fieldName)
    return value
  }
  return serializeDateTime(value, fieldName)
}

function serializeBoxes(value, fieldName) {
  if (!isPlainObject(value)) throw new Error(`Invalid ${fieldName}`)

  const boxes = cloneValue(value)
  for (const field of ['deliveryDate', 'returnDate']) {
    if (hasOwn(value, field)) boxes[field] = serializeBoxDate(value[field], `${fieldName}.${field}`)
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
    } else {
      result[field] = cloneValue(order[field])
    }
  })

  return result
}

function serializePricingOverrides(value, fieldName = 'pricingOverrides') {
  if (!isPlainObject(value)) throw new Error(`Invalid ${fieldName}`)

  return Object.fromEntries(
    PRICING_COMPONENTS.map((component) => {
      const componentValue = value[component]
      if (componentValue === null || componentValue === undefined) return [component, null]

      if (component === 'fees') {
        return [component, normalizeFeeList(componentValue, `${fieldName}.${component}`)]
      }

      const number = toFiniteNumberOrNull(componentValue)
      if (number === null) throw new Error(`Invalid ${fieldName}.${component}`)
      return [component, number]
    }),
  )
}

function serializeDraftOrder(order) {
  if (!isPlainObject(order)) throw new Error('Invalid draft order')

  return {
    ...serializeBookingFields(order),
    pricingOverrides: serializePricingOverrides(order.pricingOverrides),
    originalOrder: order.originalOrder === null || order.originalOrder === undefined
      ? null
      : cloneValue(order.originalOrder),
  }
}

function serializeDraft(order) {
  return {
    version: DRAFT_VERSION,
    order: serializeDraftOrder(order),
  }
}

function deserializeDraft(payload) {
  if (!isPlainObject(payload)) throw new Error('Invalid draft payload')
  if (payload.version !== DRAFT_VERSION) {
    throw new Error(`Unsupported draft version: ${String(payload.version)}`)
  }
  if (!isPlainObject(payload.order)) throw new Error('Invalid draft payload: order is required')

  const order = payload.order
  const draftOrder = {
    ...Object.fromEntries(
      BOOKING_FIELDS.filter((field) => hasOwn(order, field)).map((field) => [field, cloneValue(order[field])]),
    ),
    pricingOverrides: cloneValue(order.pricingOverrides),
    originalOrder: cloneValue(order.originalOrder),
  }

  return hydrateCanonicalOrder(draftOrder)
}

function toCreateOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')
  return serializeBookingFields(order)
}

function toUpdateOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  return {
    ...serializeBookingFields(order),
    pricingOverrides: serializePricingOverrides(order.pricingOverrides),
  }
}

function toCommunicationOrder(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  const pricing = getOrderPricing(order)
  return {
    ...serializeBookingFields(order),
    pricingOverrides: {
      price: pricing.price,
      fees: cloneValue(pricing.fees),
      boxesPrice: pricing.boxesPrice,
    },
    price: cloneValue(pricing.price),
    fees: cloneValue(pricing.fees),
    boxesPrice: cloneValue(pricing.boxesPrice),
  }
}

export {
  serializeDraft,
  deserializeDraft,
  toCreateOrderPayload,
  toUpdateOrderPayload,
  toCommunicationOrder,
}
