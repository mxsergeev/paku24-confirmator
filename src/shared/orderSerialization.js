import { BOOKING_FIELDS } from './orderModel.js'
import { normalizeFeeList } from './orderPricing.js'
import { isDateOnly, parseCalendarDate, parseInstant } from './date-fns-tz.js'
import { cloneValue, hasOwn, isPlainObject, PRICING_COMPONENTS, toFiniteNumberOrNull } from './orderPrimitives.js'

const ADDRESS_FIELDS = ['street', 'index', 'city', 'floor', 'elevator']
const ADDRESS_DEFAULTS = {
  street: '',
  index: '',
  city: '',
  floor: 0,
  elevator: false,
}
const OPTIONAL_OBJECT_FIELDS = new Set([
  'service',
  'paymentType',
  'address',
  'extraAddresses',
  'destination',
  'boxes',
])

function serializeAddress(value) {
  if (!isPlainObject(value)) return cloneValue(value)

  return Object.fromEntries(
    ADDRESS_FIELDS.map((field) => [
      field,
      cloneValue(value[field] ?? ADDRESS_DEFAULTS[field]),
    ]),
  )
}

function serializeExtraAddresses(value) {
  if (!Array.isArray(value)) return cloneValue(value)
  return value.filter((address) => address !== null && address !== undefined).map(serializeAddress)
}

function hasRequiredFields(value, fields) {
  return isPlainObject(value) && fields.every((field) => {
    const fieldValue = value[field]
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
  })
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

function serializeBoxes(value, fieldName, fallbackDate) {
  if (value === null || value === undefined) return undefined
  if (!isPlainObject(value)) throw new Error(`Invalid ${fieldName}`)

  const boxes = cloneValue(value)
  for (const field of ['deliveryDate', 'returnDate']) {
    const date = value[field] ?? fallbackDate
    if (date === null || date === undefined) throw new Error(`Invalid ${fieldName}.${field}`)
    boxes[field] = serializeBoxDate(date, `${fieldName}.${field}`)
  }
  boxes.amount = value.amount ?? 0
  for (const field of ['pricePerBox', 'deliveryPrice', 'returnPrice']) {
    if (boxes[field] === null || boxes[field] === undefined) delete boxes[field]
  }
  return boxes
}

function serializeBookingFields(order) {
  const result = {}

  BOOKING_FIELDS.forEach((field) => {
    if (!hasOwn(order, field)) return
    if (OPTIONAL_OBJECT_FIELDS.has(field) && (order[field] === null || order[field] === undefined)) {
      return
    }

    if (field === 'date') result.date = serializeDateTime(order.date, 'date')
    else if (field === 'boxes') {
      const boxes = serializeBoxes(order.boxes, 'boxes', order.date)
      if (boxes !== undefined) result.boxes = boxes
    }
    else if (field === 'address' || field === 'destination') {
      result[field] = serializeAddress(order[field])
    } else if (field === 'extraAddresses') {
      result.extraAddresses = serializeExtraAddresses(order.extraAddresses)
    } else if (field === 'service') {
      if (!hasRequiredFields(order.service, ['id', 'name', 'pricePerHour'])) return
      result.service = cloneValue(order.service)
      if (result.service.fee === null || result.service.fee === undefined) delete result.service.fee
    } else if (field === 'paymentType') {
      if (!hasRequiredFields(order.paymentType, ['id', 'name'])) return
      result.paymentType = cloneValue(order.paymentType)
      if (result.paymentType.fee === null || result.paymentType.fee === undefined) {
        delete result.paymentType.fee
      }
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

function toOrderPayload(order) {
  if (!isPlainObject(order)) throw new Error('Order must be an object')

  return {
    ...serializeBookingFields(order),
    pricingOverrides: serializePricingOverrides(order.pricingOverrides || {}),
  }
}

export {
  toOrderPayload,
}
