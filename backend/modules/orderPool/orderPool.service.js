import Order from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import {
  BOOKING_FIELDS,
  normalizeOrder,
  revertToInitial,
  updateOrderField,
} from '../../../src/shared/orderModel.js'

const PRICING_COMPONENTS = ['price', 'fees', 'boxesPrice']
const UPDATE_FIELDS = new Set([...BOOKING_FIELDS, 'pricing'])

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function validationError(message) {
  return newErrorWithCustomName('ValidationError', message)
}

function assertUpdateData(updateData) {
  if (!isPlainObject(updateData)) {
    throw validationError('updateData must be a plain object')
  }

  for (const key of Object.keys(updateData)) {
    if (!UPDATE_FIELDS.has(key)) {
      throw validationError(`Field is not editable: ${key}`)
    }
  }
}

/**
 * Pricing updates are a complete state, rather than a patch. The shared
 * model supplies the actual value/source validation (including finite zeroes,
 * empty fee arrays, missing initial values, and manual-value requirements).
 */
function normalizePricingUpdate(current, pricing) {
  if (!isPlainObject(pricing)) throw validationError('pricing must be a plain object')
  if (!isPlainObject(pricing.source)) {
    throw validationError('pricing.source must be a plain object')
  }
  if (!isPlainObject(pricing.manual)) {
    throw validationError('pricing.manual must be a plain object')
  }

  for (const component of PRICING_COMPONENTS) {
    if (!hasOwn(pricing.source, component)) {
      throw validationError(`pricing.source.${component} is required`)
    }
    if (!hasOwn(pricing.manual, component)) {
      throw validationError(`pricing.manual.${component} is required`)
    }
  }

  try {
    return normalizeOrder({
      ...current,
      pricing,
    })
  } catch (err) {
    throw validationError(err.message)
  }
}

function canonicalOrderObject(order) {
  try {
    return normalizeOrder(order.toObject())
  } catch (err) {
    throw validationError(err.message)
  }
}

function assignCanonicalState(order, canonical) {
  BOOKING_FIELDS.forEach((field) => {
    order[field] = canonical[field]
  })

  order.pricing = canonical.pricing
  order.price = canonical.price
  order.fees = canonical.fees
  order.boxesPrice = canonical.boxesPrice
}

function normalizeBookingUpdateValue(current, field, value) {
  // Null is an intentional update value. Leave it intact so it is not
  // confused with omission (and let the model/Mongoose boundary validate it).
  if (value === null || value === undefined) return value

  if (field !== 'date' && field !== 'boxes') return value

  try {
    const bookingValue =
      field === 'boxes' && isPlainObject(value)
        ? { ...current.boxes, ...value }
        : value
    return normalizeOrder({
      ...current,
      [field]: bookingValue,
    })[field]
  } catch (err) {
    throw validationError(err.message)
  }
}

async function getOrderById(id) {
  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  return order
}

async function updateOrder(id, updateData) {
  assertUpdateData(updateData)

  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  let canonical = canonicalOrderObject(order)

  // Apply pricing first. A subsequent dependent booking edit must be allowed
  // to move an explicitly selected initial component back to automatic.
  if (hasOwn(updateData, 'pricing')) {
    canonical = normalizePricingUpdate(canonical, updateData.pricing)
  }

  for (const field of BOOKING_FIELDS) {
    if (!hasOwn(updateData, field)) continue

    try {
      canonical = updateOrderField(
        canonical,
        field,
        normalizeBookingUpdateValue(canonical, field, updateData[field]),
      )
    } catch (err) {
      throw validationError(err.message)
    }
  }

  assignCanonicalState(order, canonical)

  await order.save()

  return order
}

async function revertOrder(id) {
  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  let reverted
  try {
    // Revert before assigning anything to the document. The shared helper
    // replaces pricing sources first, so a stale current source cannot block
    // the required automatic fallback for a missing snapshot component.
    reverted = revertToInitial(order.toObject())
  } catch (err) {
    throw validationError(err.message)
  }

  assignCanonicalState(order, reverted)
  await order.save()

  return order
}

export { getOrderById, updateOrder, revertOrder }

async function deleteOrderPermanently(id) {
  if (!id) throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')

  const order = await Order.findByIdAndDelete(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  return order
}

export { deleteOrderPermanently }
