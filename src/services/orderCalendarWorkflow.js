import calendarAPI from './calendarAPI'
import orderPoolAPI from './orderPoolAPI'
import { toCreateOrderPayload } from '../shared/orderSerialization'
import { isDeleted } from '../shared/orderState.helpers'

/**
 * Persist an order when needed, reconcile its calendar events, and finish the
 * pool lifecycle. The calendar endpoint owns event rendering and always loads
 * the canonical persisted order by ID.
 * UI callers own status, loading, and notification state around this operation.
 */
export default async function addOrderToCalendar({
  order,
  orderId,
  onOrderPersisted,
  onOrderUpdated,
} = {}) {
  const workflowToken = {}

  if (isDeleted(order)) {
    throw new Error('Deleted orders cannot be synchronized to calendar.')
  }

  let persistedOrderId = orderId || order?.id
  if (!persistedOrderId) {
    const { id } = await orderPoolAPI.add({
      order: toCreateOrderPayload(order),
    })
    persistedOrderId = id
    if (!persistedOrderId) throw new Error('Order was added but no ID was returned')
    onOrderPersisted?.(persistedOrderId, workflowToken)
  }

  const response = await calendarAPI.syncOrder(persistedOrderId)
  if (!order?.confirmed) {
    const confirmation = await orderPoolAPI.confirm(persistedOrderId)
    if (confirmation?.order) onOrderUpdated?.(confirmation.order, workflowToken)
  }
  return response
}
