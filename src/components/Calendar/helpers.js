export function getOrderIcons(order, iconsData) {
  const icons = []
  if (order.paymentType && iconsData.payment && iconsData.payment[order.paymentType.id]) {
    icons.push(iconsData.payment[order.paymentType.id])
  }
  if (order.service && iconsData.service && iconsData.service[order.service.id]) {
    icons.push(iconsData.service[order.service.id])
  }
  if (order.fees && Array.isArray(order.fees)) {
    order.fees.forEach((fee) => {
      if (iconsData.fees && iconsData.fees[fee.name]) {
        icons.push(iconsData.fees[fee.name])
      }
    })
  }
  if (order.size && iconsData.size && iconsData.size[order.size]) {
    icons.push(iconsData.size[order.size])
  }
  return icons.join(' ')
}

/**
 * Parse calendar event ID and return order ID and event type
 * @param {string} eventId - Event ID (e.g., "12345-box-delivery" or "12345")
 * @returns {{ orderId: string, eventType: string | null }} - Real order ID and event type
 */
export function parseBoxEventId(eventId) {
  if (!eventId) return { orderId: null, eventType: null }

  if (eventId.includes('-box-delivery')) {
    return {
      orderId: eventId.replace('-box-delivery', ''),
      eventType: 'boxDelivery',
    }
  }

  if (eventId.includes('-box-return')) {
    return {
      orderId: eventId.replace('-box-return', ''),
      eventType: 'boxReturn',
    }
  }

  return { orderId: eventId, eventType: null }
}

/**
 * Get title for box event
 * @param {object} order - Order object
 * @param {string} eventType - "boxDelivery" or "boxReturn"
 * @param {string} eventTime - Formatted time string
 * @param {object} iconsData - Icons data
 * @returns {string} - Event title
 */
export function getBoxEventTitle(order, eventType, eventTime, iconsData) {
  const boxIcon = iconsData?.boxes?.[eventType === 'boxDelivery' ? 'delivery' : 'pickup'] || '📦'
  const action = eventType === 'boxDelivery' ? '' : 'Nouto'
  const name = order.name || ''
  const time = eventTime ? `${eventTime} ` : ''

  return `${action} ${boxIcon} ${time}${name}`.trim()
}
