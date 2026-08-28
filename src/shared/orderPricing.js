import services from '../data/services.json' with { type: 'json' }
import boxesSettings from '../data/boxes.json' with { type: 'json' }
import {
  HELSINKI_TIMEZONE,
  formatInTimeZone,
  isDateOnly,
  parseDateOnly,
  parseDateTime,
} from './date-fns-tz.js'
import { calculateAutomaticFees } from './fees.js'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

function finiteNumber(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeFeeList(value, description) {
  if (!Array.isArray(value)) throw new Error(`${description} must be an array`)

  return value.map((fee) => {
    const amount = finiteNumber(fee?.amount)
    if (!fee || typeof fee !== 'object' || amount === null) {
      throw new Error(`${description} must contain finite fee amounts`)
    }

    return { ...fee, amount }
  })
}

function findServiceById(id) {
  if (id === null || id === undefined) return null
  return services.find((service) => String(service.id) === String(id)) || null
}

function parseBoxDate(value, fieldName) {
  return isDateOnly(value) ? parseDateOnly(value, fieldName) : parseDateTime(value, fieldName)
}

function calculateBoxPeriod(deliveryDate, returnDate) {
  const delivery = parseBoxDate(deliveryDate, 'boxes.deliveryDate')
  const returned = parseBoxDate(returnDate, 'boxes.returnDate')
  const duration = Math.trunc((returned.getTime() - delivery.getTime()) / DAY_IN_MILLISECONDS)

  return Math.max(duration, Number(boxesSettings.minPeriod) || 0)
}

function sumFees(feeList) {
  return feeList.reduce((total, fee) => total + fee.amount, 0)
}

function servicePrice(order) {
  const embeddedService = order?.service
  const catalogService = findServiceById(embeddedService?.id)
  const hourlyRate = finiteNumber(catalogService?.pricePerHour ?? embeddedService?.pricePerHour)
  const duration = finiteNumber(order?.duration)

  if (hourlyRate === null || duration === null) return 0
  return hourlyRate * duration
}

function calculateAutomaticBoxesPrice(order) {
  const boxes = order?.boxes
  const amount = finiteNumber(boxes?.amount)

  if (amount === null || amount <= 0) return 0

  const duration = calculateBoxPeriod(boxes?.deliveryDate, boxes?.returnDate)
  const pricePerBox = finiteNumber(boxesSettings.price) ?? 0
  const deliveryFee = finiteNumber(boxesSettings.deliveryFee) ?? 0
  const pickupFee = finiteNumber(boxesSettings.pickupFee) ?? 0

  return amount * pricePerBox * duration + deliveryFee + pickupFee
}

function calculateAutomaticPricing(order) {
  const automaticFees = normalizeFeeList(calculateAutomaticFees(order), 'Automatic fees')
  const automaticBoxesPrice = calculateAutomaticBoxesPrice(order)

  return {
    price: servicePrice(order) + automaticBoxesPrice + sumFees(automaticFees),
    fees: automaticFees,
    boxesPrice: automaticBoxesPrice,
  }
}

function resolveActiveFees(order) {
  const source = order?.pricing?.source?.fees

  if (source === 'initial') {
    const value = order?.initialSnapshot?.fees
    if (value === null || value === undefined) {
      throw new Error('Cannot use initial fees: the snapshot value is missing')
    }
    return normalizeFeeList(value, 'Initial fees')
  }

  if (source === 'manual') {
    const value = order?.pricing?.manual?.fees
    if (value === null || value === undefined) {
      throw new Error('Cannot use manual fees: the manual value is missing')
    }
    return normalizeFeeList(value, 'Manual fees')
  }

  if (source === 'auto') return normalizeFeeList(calculateAutomaticFees(order), 'Automatic fees')

  throw new Error(`Invalid pricing source for fees: ${String(source)}`)
}

function resolveActiveBoxesPrice(order) {
  const source = order?.pricing?.source?.boxesPrice

  if (source === 'initial') {
    const value = order?.initialSnapshot?.boxesPrice
    const number = finiteNumber(value)
    if (number === null) {
      throw new Error('Cannot use initial boxesPrice: the snapshot value is missing or invalid')
    }
    return number
  }

  if (source === 'manual') {
    const value = order?.pricing?.manual?.boxesPrice
    const number = finiteNumber(value)
    if (number === null) {
      throw new Error('Cannot use manual boxesPrice: the manual value is missing or invalid')
    }
    return number
  }

  if (source === 'auto') return calculateAutomaticBoxesPrice(order)

  throw new Error(`Invalid pricing source for boxesPrice: ${String(source)}`)
}

function resolveActivePrice(order, fees, boxesPrice) {
  const source = order?.pricing?.source?.price

  if (source === 'initial') {
    const value = order?.initialSnapshot?.price
    const number = finiteNumber(value)
    if (number === null) {
      throw new Error('Cannot use initial price: the snapshot value is missing or invalid')
    }
    return number
  }

  if (source === 'manual') {
    const value = order?.pricing?.manual?.price
    const number = finiteNumber(value)
    if (number === null) {
      throw new Error('Cannot use manual price: the manual value is missing or invalid')
    }
    return number
  }

  if (source === 'auto') {
    const activeFees = fees ?? resolveActiveFees(order)
    const activeBoxesPrice = boxesPrice ?? resolveActiveBoxesPrice(order)
    return servicePrice(order) + activeBoxesPrice + sumFees(activeFees)
  }

  throw new Error(`Invalid pricing source for price: ${String(source)}`)
}

function resolveActivePricing(order) {
  const fees = resolveActiveFees(order)
  const boxesPrice = resolveActiveBoxesPrice(order)
  return {
    price: resolveActivePrice(order, fees, boxesPrice),
    fees,
    boxesPrice,
  }
}

function materializeActivePricing(order) {
  if (!order || typeof order !== 'object') throw new Error('Cannot materialize pricing for an empty order')

  const active = resolveActivePricing(order)
  return {
    ...order,
    price: active.price,
    fees: active.fees,
    boxesPrice: active.boxesPrice,
  }
}

function getEventColor(order) {
  if (order && order.eventColor !== null && order.eventColor !== undefined) {
    return order.eventColor
  }

  const embeddedService = order?.service
  const catalogService = findServiceById(embeddedService?.id)
  const catalogColor = catalogService?.eventColor
  if (catalogColor !== null && catalogColor !== undefined) return catalogColor

  const embeddedColor = embeddedService?.eventColor
  return embeddedColor !== null && embeddedColor !== undefined ? embeddedColor : null
}

function orderTime(order) {
  const date = parseDateTime(order?.date, 'order date')
  return formatInTimeZone(date, 'HH:mm', HELSINKI_TIMEZONE)
}

export {
  servicePrice,
  calculateAutomaticBoxesPrice,
  calculateAutomaticPricing,
  resolveActiveFees,
  resolveActiveBoxesPrice,
  resolveActivePrice,
  resolveActivePricing,
  materializeActivePricing,
  normalizeFeeList,
  getEventColor,
  orderTime,
}
