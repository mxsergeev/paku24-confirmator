import Order from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import * as logger from '../../utils/logger.js'
import { syncOrderToGoogleCalendar } from '../calendar/googleCalendar.js'

const EDITABLE_FIELDS = [
  'distance', 'hsy', 'eventColor', 'date', 'duration', 'service', 'paymentType',
  'address', 'extraAddresses', 'destination', 'boxes', 'name', 'email', 'phone',
  'comment', 'pricingOverrides',
]

const CALENDAR_SYNC_WARNING = {
  code: 'CALENDAR_SYNC_FAILED',
  message: 'Order was saved, but Google Calendar could not be synchronized.',
}

function validationError(message) {
  return newErrorWithCustomName('ValidationError', message)
}

function resultWithWarning(order, warning = null) {
  return { order, warning: warning ? { ...warning } : null }
}

async function getOrderById(id) {
  const order = await Order.findById(id)
  if (!order) throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  return order
}

async function syncAfterSave(order) {
  if (!order.confirmed) return resultWithWarning(order)
  try {
    await syncOrderToGoogleCalendar(order)
    return resultWithWarning(order)
  } catch (error) {
    logger.error('Order calendar synchronization failed after persisted mutation', error)
    return resultWithWarning(order, CALENDAR_SYNC_WARNING)
  }
}

async function updateOrder(id, updateData) {
  const order = await getOrderById(id)
  if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
    throw validationError('updateData must be an object')
  }
  for (const field of EDITABLE_FIELDS) {
    if (Object.hasOwn(updateData, field)) order[field] = updateData[field]
  }
  await order.save()
  return syncAfterSave(order)
}

async function confirmOrder(id, userId) {
  if (!id) return null
  const order = await getOrderById(id)
  if (order.deletedAt) throw validationError('Deleted orders cannot be confirmed')
  if (!order.confirmed) {
    const now = new Date()
    order.confirmed = true
    order.confirmedBy = userId
    order.confirmedAt = now
    await order.save()
  }
  return syncAfterSave(order)
}

async function cancelOrder(id) {
  if (!id) return null
  const order = await getOrderById(id)
  if (order.deletedAt) throw validationError('Deleted orders cannot be canceled')
  if (!order.canceledAt) {
    order.canceledAt = new Date()
    await order.save()
  }
  return syncAfterSave(order)
}

async function deleteOrder(id) {
  if (!id) return null
  const order = await getOrderById(id)
  if (!order.deletedAt) {
    order.deletedAt = new Date()
    await order.save()
  }
  return syncAfterSave(order)
}

async function restoreOrder(id) {
  if (!id) return null
  const order = await getOrderById(id)
  order.deletedAt = undefined
  order.canceledAt = undefined
  await order.save()
  return syncAfterSave(order)
}

async function deleteOrderPermanently(id) {
  if (!id) throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  const order = await getOrderById(id)
  if (!order.deletedAt) throw validationError('Order must be soft-deleted before permanent deletion')
  await syncOrderToGoogleCalendar(order)
  const result = await Order.deleteOne({ _id: id })
  const deleted = result?.deletedCount ?? result?.n
  if (deleted === 0) throw newErrorWithCustomName('OrderNotFoundError', 'Order not found')
  return order
}

export {
  getOrderById,
  updateOrder,
  confirmOrder,
  cancelOrder,
  deleteOrder,
  restoreOrder,
  deleteOrderPermanently,
}
