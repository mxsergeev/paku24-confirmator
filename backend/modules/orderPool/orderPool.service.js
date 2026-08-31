import Order from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import { DEFAULT_EVENT_COLOR_ID } from '../../utils/colors.js'
import * as logger from '../../utils/logger.js'
import {
  BOOKING_FIELDS,
  applyOrderPatch,
  hydrateCanonicalOrder,
  revertToInitial,
} from '../../../src/shared/orderModel.js'
import { isOrderValidationError } from '../../../src/shared/orderPrimitives.js'
import { deleteOrderEvent, syncOrderToCalendar } from '../calendar/calendar.sync.js'

const CALENDAR_SYNC_WARNING = {
  code: 'CALENDAR_SYNC_FAILED',
  message: 'Order was saved, but its calendar events could not be synchronized.',
}

const CALENDAR_CONFIRMATION_WARNING = {
  code: 'CALENDAR_CONFIRMATION_FAILED',
  message: 'Order remains unconfirmed because its calendar events could not be synchronized.',
}

const CALENDAR_DELETE_WARNING = {
  code: 'CALENDAR_DELETE_FAILED',
  message: 'Order was not deleted because its calendar events could not be removed.',
}

function calendarUnavailableError(message) {
  return newErrorWithCustomName('CalendarUnavailableError', message)
}

function resultWithWarning(order, warning) {
  return warning ? { order, warning: { ...warning } } : order
}

function isConfirmedAndActive(order) {
  return Boolean(order?.confirmed && !order?.deletedAt)
}

async function syncAfterMutation(order, warning = CALENDAR_SYNC_WARNING) {
  if (!isConfirmedAndActive(order)) return order

  try {
    await syncOrderToCalendar(order)
    return order
  } catch (err) {
    // Calendar reconciliation is deliberately best effort for ordinary order
    // mutations. Keep the API warning stable and log the provider detail only
    // on the server.
    logger.error('Order calendar synchronization failed after persisted mutation', err)
    return resultWithWarning(order, warning)
  }
}

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

  return syncAfterMutation(order)
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

  return syncAfterMutation(order)
}

async function confirmOrder(id, userId) {
  if (!id) return null

  const order = await getOrderById(id)

  if (order.deletedAt) {
    throw validationError('Deleted orders cannot be confirmed')
  }

  // Confirmation has an external precondition. Reconcile the persisted order
  // first, so a calendar failure cannot leave Mongo marked as confirmed.
  if (!order.confirmed) {
    try {
      await syncOrderToCalendar(order)
    } catch (err) {
      logger.error('Order calendar synchronization failed before confirmation', err)
      throw calendarUnavailableError(CALENDAR_CONFIRMATION_WARNING.message)
    }
  } else {
    // A retry of an already-confirmed request is safe and can repair missing
    // calendar links without creating duplicate events.
    try {
      await syncOrderToCalendar(order)
    } catch (err) {
      logger.error('Order calendar synchronization failed while confirming', err)
      throw calendarUnavailableError(CALENDAR_SYNC_WARNING.message)
    }
  }

  if (order.confirmed) return order

  const confirmed = await Order.findByIdAndUpdate(
    { _id: id },
    {
      confirmed: true,
      confirmedBy: userId,
      confirmedAt: new Date().toISOString(),
    },
    { new: true },
  )

  if (!confirmed) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  return confirmed
}

async function cancelOrder(id) {
  if (!id) return null

  const order = await Order.findByIdAndUpdate(
    { _id: id },
    {
      canceledAt: new Date().toISOString(),
      eventColor: '8',
    },
    { new: true },
  )

  return order ? syncAfterMutation(order) : null
}

async function updateOrderColor(id, eventColor) {
  if (!id) return null

  const order = await Order.findOneAndUpdate({ _id: id }, { $set: { eventColor } }, { new: true })

  return order ? syncAfterMutation(order) : null
}

async function deleteOrder(id) {
  if (!id) return null

  const order = await getOrderById(id)

  // Calendar events are owned by the order. Delete every owned role before
  // marking the row deleted; a failed provider call leaves the row active so
  // the operation can be retried with the IDs that remain linked.
  try {
    await deleteOrderEvent(order)
  } catch (err) {
    logger.error('Order calendar deletion failed before soft delete', err)
    throw calendarUnavailableError(CALENDAR_DELETE_WARNING.message)
  }

  return Order.findByIdAndUpdate(
    { _id: id },
    { deletedAt: new Date().toISOString() },
    { new: true },
  )
}

async function retrieveOrder(id) {
  if (!id) return null

  const order = await Order.findByIdAndUpdate({ _id: id }, { $unset: { deletedAt: 1 } }, { new: true })

  return order ? syncAfterMutation(order) : null
}

async function restoreOrder(id) {
  if (!id) return null

  const order = await Order.findByIdAndUpdate(
    { _id: id },
    { $unset: { deletedAt: 1, canceledAt: 1 }, $set: { eventColor: DEFAULT_EVENT_COLOR_ID } },
    { new: true },
  )

  return order ? syncAfterMutation(order) : null
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
