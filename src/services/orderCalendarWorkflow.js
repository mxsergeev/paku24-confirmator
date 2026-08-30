import addEventToCalendar from './calendarAPI'
import orderPoolAPI from './orderPoolAPI'
import { toCommunicationOrder, toCreateOrderPayload } from '../shared/orderSerialization'

/**
 * Add an order's events to the calendar and finish the pool lifecycle.
 * UI callers own status, loading, and notification state around this operation.
 */
export default async function addOrderToCalendar({ order, orderId }) {
  const response = await addEventToCalendar({
    order: toCommunicationOrder(order),
    orderId,
  })

  let persistedOrderId = orderId
  if (!persistedOrderId) {
    const { id } = await orderPoolAPI.add({
      order: toCreateOrderPayload(order),
    })
    persistedOrderId = id
  }

  await orderPoolAPI.confirm(persistedOrderId)
  return response
}
