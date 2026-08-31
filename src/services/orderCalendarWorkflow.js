import orderPoolAPI from './orderPoolAPI'
import { toCreateOrderPayload, toUpdateOrderPayload } from '../shared/orderSerialization'
import { isDeleted } from '../shared/orderState.helpers'

/**
 * Persist an order when needed, reconcile its calendar events, and finish the
 * pool lifecycle. Server-side lifecycle operations own event rendering and
 * always load the canonical persisted order by ID.
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
  const isNewOrder = !persistedOrderId
  let authoritativeOrder = order
  let updateResponse = null
  if (isNewOrder) {
    const { id } = await orderPoolAPI.add({
      order: toCreateOrderPayload(order),
    })
    persistedOrderId = id
    if (!persistedOrderId) throw new Error('Order was added but no ID was returned')
    onOrderPersisted?.(persistedOrderId, workflowToken)
  } else {
    if (!order) throw new Error('Order is required when synchronizing a persisted order')

    // Persist the current editor state before any lifecycle action. Calendar
    // synchronization is server-authoritative and reloads this order by ID,
    // so sending only the ID here would discard local edits.
    updateResponse = await orderPoolAPI.update(
      persistedOrderId,
      toUpdateOrderPayload(order),
    )
    authoritativeOrder = updateResponse?.order || updateResponse
    if (isDeleted(authoritativeOrder)) {
      throw new Error('Deleted orders cannot be synchronized to calendar.')
    }
    if (authoritativeOrder) onOrderUpdated?.(authoritativeOrder, workflowToken)
  }

  // Confirmation owns the calendar-before-confirmation precondition. This
  // avoids a second provider reconciliation for unconfirmed orders.
  if (isNewOrder || !authoritativeOrder?.confirmed) {
    const confirmation = await orderPoolAPI.confirm(persistedOrderId)
    if (confirmation?.order) onOrderUpdated?.(confirmation.order, workflowToken)
    return confirmation
  }

  // For an existing confirmed order, update() already performed the explicit
  // best-effort calendar reconciliation and returned its warning, if any.
  return updateResponse || authoritativeOrder
}
