import Order from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import {
  BOOKING_FIELDS,
  applyOrderPatch,
  normalizeOrder,
  revertToInitial,
} from '../../../src/shared/orderModel.js'

function validationError(message) {
  return newErrorWithCustomName('ValidationError', message)
}

function canonicalOrderObject(order) {
  return normalizeOrder(order.toObject())
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

async function getOrderById(id) {
  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  return order
}

async function updateOrder(id, updateData) {
  const order = await getOrderById(id)

  let updated
  try {
    updated = applyOrderPatch(canonicalOrderObject(order), updateData)
  } catch (err) {
    throw validationError(err.message)
  }

  assignCanonicalState(order, updated)

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
