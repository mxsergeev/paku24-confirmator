import icons from '../../data/icons.json' with { type: 'json' }
import dayjs from '../dayjs.js'
import { formatOrder } from './text.js'

function makeIcons(order) {
  const sizeIcon = order.XL ? icons.size.XL : ''
  const distanceIcon = icons.misc[order.distance] || ''
  const feeIcons = (order.fees || [])
    .map((fee) => icons.fees[fee.name])
    .filter((icon) => icon)
    .reduce((acc, icon) => acc + icon, '')
  const serviceIcons = icons.service[order.service?.id] || ''
  const paymentIcons = icons.payment[order.paymentType?.id] || ''

  return {
    move: `${sizeIcon}${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}`,
    boxesDelivery: icons.boxes.delivery,
    boxesPickup: icons.boxes.pickup,
  }
}

function safeDateString(value) {
  if (!value) return ''
  if (typeof value === 'string') return value

  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
    if (value && typeof value.toISOString === 'function') return value.toISOString()
    return String(value)
  } catch (err) {
    return String(value)
  }
}

function hasTime(value) {
  return typeof value === 'string' ? value.includes('T') : Boolean(value)
}

function makeCalendarEntries(order) {
  const orderIcons = makeIcons(order)
  const moveTitle = `${orderIcons.move}${dayjs(order.date).format('HH:mm')}(${order.duration}h)`
  const boxes = order.boxes || { amount: 0, deliveryDate: '', returnDate: '' }
  const deliveryDateStr = safeDateString(boxes.deliveryDate)
  const returnDateStr = safeDateString(boxes.returnDate)

  const boxesDeliveryTitle = `${boxes.amount} ${orderIcons.boxesDelivery} ${
    deliveryDateStr && hasTime(boxes.deliveryDate)
      ? `${dayjs(deliveryDateStr).format('HH:mm')} `
      : ''
  }`
  const boxesPickupTitle = `NOUTO ${boxes.amount} ${orderIcons.boxesPickup} ${
    returnDateStr && hasTime(boxes.returnDate) ? `${dayjs(returnDateStr).format('HH:mm')} ` : ''
  }`

  return {
    move: {
      title: `${moveTitle} ${order.name}`,
      description: `${moveTitle}${formatOrder(
        order,
        {
          title: 0,
          date: 0,
          time: 0,
          duration: 0,
          paymentType: 0,
        },
        { removeFirstHeading: true },
      )}`,
    },
    deliveryDate: {
      title: `${boxesDeliveryTitle}${order.name}`,
      description: `${boxesDeliveryTitle}${formatOrder(
        order,
        {
          address: 1,
          name: 1,
          email: 1,
          phone: 1,
          boxes: 1,
        },
        { removeFirstHeading: true },
      )}`,
    },
    returnDate: {
      title: `${boxesPickupTitle}${order.name}`,
      description: `${boxesPickupTitle}${formatOrder(
        order,
        {
          destination: 1,
          name: 1,
          email: 1,
          phone: 1,
          boxes: 1,
        },
        { removeFirstHeading: true },
      )}`,
    },
  }
}

export { makeCalendarEntries, makeIcons }
