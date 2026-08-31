import interceptor from './interceptor'

const baseUrl = '/api/calendar'

/**
 * Reconcile the calendar events for a persisted order.
 *
 * The calendar endpoint loads the canonical order by ID. Sending only the ID
 * prevents stale client state (including stale event IDs) from being treated
 * as authoritative.
 *
 * @param {string} orderId
 */
async function syncOrder(orderId) {
  if (!orderId) throw new Error('Order ID is required to sync calendar')

  const response = await interceptor.axiosInstance.post(baseUrl, { orderId })
  return response.data
}

export { syncOrder }

export default { syncOrder }
