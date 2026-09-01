import { BOOKING_FIELDS } from './orderModel.js'
import { normalizeFeeList } from './orderPricing.js'
import { isDateOnly, parseCalendarDate, parseInstant } from './date-fns-tz.js'
import { cloneValue, hasOwn, isPlainObject, PRICING_COMPONENTS, toFiniteNumberOrNull } from './orderPrimitives.js'

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

function toCreateOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  return {
    ...serializeBookingFields(order),
    pricingOverrides: serializePricingOverrides(order.pricingOverrides),
  }
}

function toUpdateOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  return {
    ...serializeBookingFields(order),
    pricingOverrides: serializePricingOverrides(order.pricingOverrides),
  }
}

export {
  toCreateOrderPayload,
  toUpdateOrderPayload,
}
