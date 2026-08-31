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
import {
  deleteOrderEvent,
  syncOrderToCalendar,
  withOrderCalendarLock,
} from '../calendar/calendar.sync.js'

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

// Callers invoke this while holding the order calendar lock. Calendar sync
// must not reacquire that lock before the mutation request can finish.
async function syncAfterMutation(order, warning = CALENDAR_SYNC_WARNING) {
  if (!isConfirmedAndActive(order)) return order

  try {
    await syncOrderToCalendar(order, { lock: false })
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

  return withOrderCalendarLock(order, async () => {
    const currentOrder = await getOrderById(id)
    let updated
    try {
      updated = applyOrderPatch(canonicalOrderObject(currentOrder), updateData)
    } catch (err) {
      if (!isOrderValidationError(err)) throw err
      throw validationError(err.message)
    }

    assignCanonicalState(currentOrder, updated)
    await currentOrder.save()
    return syncAfterMutation(currentOrder)
  })
}

async function revertOrder(id) {
  const order = await getOrderById(id)

  return withOrderCalendarLock(order, async () => {
    const currentOrder = await getOrderById(id)
    let reverted
    try {
      // Revert before assigning anything to the document. The shared helper
      // replaces pricing sources first, so a stale current source cannot block
      // the required automatic fallback for a missing snapshot component.
      reverted = revertToInitial(canonicalOrderObject(currentOrder))
    } catch (err) {
      if (!isOrderValidationError(err)) throw err
      throw validationError(err.message)
    }

    assignCanonicalState(currentOrder, reverted)
    await currentOrder.save()
    return syncAfterMutation(currentOrder)
  })
}

async function confirmOrder(id, userId) {
  if (!id) return null

  const order = await getOrderById(id)

  return withOrderCalendarLock(order, async () => {
    // Reload while holding the same lock used by deletion. This prevents a
    // confirmation that started first from marking a row confirmed after a
    // concurrent deletion has removed its calendar ownership.
    const currentOrder = await getOrderById(id)

    if (currentOrder.deletedAt) {
      throw validationError('Deleted orders cannot be confirmed')
    }

    // Confirmation has an external precondition. Reconcile the persisted order
    // first, so a calendar failure cannot leave Mongo marked as confirmed.
    try {
      await syncOrderToCalendar(currentOrder, { lock: false })
    } catch (err) {
      logger.error(
        currentOrder.confirmed
          ? 'Order calendar synchronization failed while confirming'
          : 'Order calendar synchronization failed before confirmation',
        err,
      )
      throw calendarUnavailableError(
        currentOrder.confirmed
          ? CALENDAR_SYNC_WARNING.message
          : CALENDAR_CONFIRMATION_WARNING.message,
      )
    }

    if (currentOrder.confirmed) return currentOrder

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
  })
}

async function cancelOrder(id) {
  if (!id) return null

  const order = await getOrderById(id)

  return withOrderCalendarLock(order, async () => {
    const currentOrder = await getOrderById(id)
    if (currentOrder.deletedAt) {
      throw validationError('Deleted orders cannot be canceled')
    }

    const canceled = await Order.findByIdAndUpdate(
      { _id: id },
      {
        canceledAt: new Date().toISOString(),
        eventColor: '8',
      },
      { new: true },
    )

    return canceled ? syncAfterMutation(canceled) : null
  })
}

async function updateOrderColor(id, eventColor) {
  if (!id) return null

  const order = await getOrderById(id)
  return withOrderCalendarLock(order, async () => {
    await getOrderById(id)
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: id },
      { $set: { eventColor } },
      { new: true },
    )
    return updatedOrder
      ? syncAfterMutation(updatedOrder)
      : null
  })
}

async function deleteOrder(id) {
  if (!id) return null

  const order = await getOrderById(id)

  // Calendar events are owned by the order. Delete every owned role before
  // marking the row deleted; a failed provider call leaves the row active so
  // the operation can be retried with the IDs that remain linked.
  return withOrderCalendarLock(order, async () => {
    try {
      await deleteOrderEvent(order, { lock: false })
    } catch (err) {
      logger.error('Order calendar deletion failed before soft delete', err)
      throw calendarUnavailableError(CALENDAR_DELETE_WARNING.message)
    }

    return Order.findByIdAndUpdate(
      { _id: id },
      { deletedAt: new Date().toISOString() },
      { new: true },
    )
  })
}

async function retrieveOrder(id) {
  if (!id) return null

  const order = await getOrderById(id)
  return withOrderCalendarLock(order, async () => {
    await getOrderById(id)
    const retrievedOrder = await Order.findByIdAndUpdate(
      { _id: id },
      { $unset: { deletedAt: 1 } },
      { new: true },
    )
    return retrievedOrder
      ? syncAfterMutation(retrievedOrder)
      : null
  })
}

async function restoreOrder(id) {
  if (!id) return null

  const order = await getOrderById(id)
  return withOrderCalendarLock(order, async () => {
    await getOrderById(id)
    const restoredOrder = await Order.findByIdAndUpdate(
      { _id: id },
      { $unset: { deletedAt: 1, canceledAt: 1 }, $set: { eventColor: DEFAULT_EVENT_COLOR_ID } },
      { new: true },
    )
    return restoredOrder
      ? syncAfterMutation(restoredOrder)
      : null
  })
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
  // failure leaves the order and its IDs available for a retry. Hold the
  // per-order lock across both operations so a concurrent sync cannot create
  // events after cleanup but before the row disappears.
  const result = await withOrderCalendarLock(order, async () => {
    await deleteOrderEvent(order, { lock: false, clearStoredIds: true })
    return Order.deleteOne({ _id: id })
  })
  const deleted = result?.deletedCount ?? result?.n
  if (deleted === 0) {
    throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  }

  return order
}

export { deleteOrderPermanently }
