import icons from '../../data/icons.json' with { type: 'json' }
import {
  HELSINKI_TIMEZONE,
  formatInTimeZone,
  parseInstant,
} from '../date-fns-tz.js'
import {
  formatMoveCalendarDescription,
  formatBoxDeliveryCalendarDescription,
  formatBoxReturnCalendarDescription,
} from './text.js'
import { getOrderPricing } from '../orderPricing.js'

function makeIcons(order) {
  const distanceIcon = icons.misc[order.distance] || ''
  const feeIcons = getOrderPricing(order).fees
    .map((fee) => icons.fees[fee.name])
    .filter((icon) => icon)
    .reduce((acc, icon) => acc + icon, '')
  const serviceIcons = icons.service[order.service?.id] || ''
  const paymentIcons = icons.payment[order.paymentType?.id] || ''

  return {
    move: `${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}`,
    boxesDelivery: icons.boxes.delivery,
    boxesPickup: icons.boxes.pickup,
  }
}

function formatOrderTime(value) {
  const date = parseInstant(value, 'order date')
  return formatInTimeZone(date, 'HH:mm', HELSINKI_TIMEZONE)
}

function formatBoxTime(value, fieldName, hasTime) {
  if (value === null || value === undefined || value === '') return ''
  if (!hasTime) return ''

  const date = parseInstant(value, fieldName)
  return `${formatInTimeZone(date, 'HH:mm', HELSINKI_TIMEZONE)} `
}

function makeCalendarEntries(order) {
  const orderIcons = makeIcons(order)
  const moveTitle = `${orderIcons.move}${formatOrderTime(order.date)}(${order.duration}h)`
  const boxes = order.boxes || {
    amount: 0,
    deliveryDate: '',
    deliveryHasTime: false,
    returnDate: '',
    returnHasTime: false,
  }
  const deliveryTime = formatBoxTime(
    boxes.deliveryDate,
    'box delivery date',
    boxes.deliveryHasTime,
  )
  const returnTime = formatBoxTime(boxes.returnDate, 'box return date', boxes.returnHasTime)

  const boxesDeliveryTitle = `${boxes.amount} ${orderIcons.boxesDelivery} ${deliveryTime}`
  const boxesPickupTitle = `NOUTO ${boxes.amount} ${orderIcons.boxesPickup} ${returnTime}`

  return {
    move: {
      title: `${moveTitle} ${order.name}`,
      description: `${moveTitle}${formatMoveCalendarDescription(order)}`,
    },
    deliveryDate: {
      title: `${boxesDeliveryTitle}${order.name}`,
      description: `${boxesDeliveryTitle}${formatBoxDeliveryCalendarDescription(order)}`,
    },
    returnDate: {
      title: `${boxesPickupTitle}${order.name}`,
      description: `${boxesPickupTitle}${formatBoxReturnCalendarDescription(order)}`,
    },
  }
}

export { makeCalendarEntries, makeIcons }
