import Order from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import { DEFAULT_EVENT_COLOR_ID } from '../../utils/colors.js'
import {
  BOOKING_FIELDS,
  applyOrderPatch,
  hydrateCanonicalOrder,
  revertToInitial,
} from '../../../src/shared/orderModel.js'
import { isOrderValidationError } from '../../../src/shared/orderPrimitives.js'
import { deleteOrderEvent } from '../calendar/calendar.sync.js'

function validationError(message) {
  return newErrorWithCustomName('ValidationError', message)
}

function canonicalOrderObject(order) {
  const { _id, ...persisted } = order.toObject()
  const id = _id === null || _id === undefined ? persisted.id : _id.toString()
  return hydrateCanonicalOrder({
    ...persisted,
    ...(id === undefined ? {} : { id }),
  })
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
    if (!isOrderValidationError(err)) throw err
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
    reverted = revertToInitial(canonicalOrderObject(order))
  } catch (err) {
    if (!isOrderValidationError(err)) throw err
    throw validationError(err.message)
  }

  assignCanonicalState(order, reverted)
  await order.save()

  return order
}

async function confirmOrder(id, userId) {
  if (!id) return null

  return Order.findByIdAndUpdate(
    { _id: id },
    {
      confirmed: true,
      confirmedBy: userId,
      confirmedAt: new Date().toISOString(),
    },
    { new: true },
  )
}

async function cancelOrder(id) {
  if (!id) return null

  return Order.findByIdAndUpdate(
    { _id: id },
    {
      canceledAt: new Date().toISOString(),
      eventColor: '8',
    },
    { new: true },
  )
}

async function updateOrderColor(id, eventColor) {
  if (!id) return null

  return Order.findOneAndUpdate({ _id: id }, { $set: { eventColor } }, { new: true })
}

async function deleteOrder(id) {
  if (!id) return null

  return Order.findByIdAndUpdate(
    { _id: id },
    { deletedAt: new Date().toISOString() },
    { new: true },
  )
}

async function retrieveOrder(id) {
  if (!id) return null

  return Order.findByIdAndUpdate({ _id: id }, { $unset: { deletedAt: 1 } }, { new: true })
}

async function restoreOrder(id) {
  if (!id) return null

  return Order.findByIdAndUpdate(
    { _id: id },
    { $unset: { deletedAt: 1, canceledAt: 1 }, $set: { eventColor: DEFAULT_EVENT_COLOR_ID } },
    { new: true },
  )
}

export {
  getOrderById,
  updateOrder,
  revertOrder,
  confirmOrder,
  cancelOrder,
  updateOrderColor,
  deleteOrder,
  retrieveOrder,
  restoreOrder,
}

async function deleteOrderPermanently(id) {
  if (!id) throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')

  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  // Remove external calendar state before deleting the row so a Google
  // failure leaves the order and its IDs available for a retry. deleteOne is
  // used after this preflight to avoid running the post findOneAndDelete hook
  // a second time for the same events.
  await deleteOrderEvent(order)
  const result = await Order.deleteOne({ _id: id })
  const deleted = result?.deletedCount ?? result?.n
  if (deleted === 0) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  return order
}

export { deleteOrderPermanently }
