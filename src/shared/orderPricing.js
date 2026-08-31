import boxesSettings from '../data/boxes.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import {
  HELSINKI_TIMEZONE,
  calendarDateToUtc,
  formatInTimeZone,
  isDateOnly,
  parseCalendarDate,
  parseInstant,
} from './date-fns-tz.js'
import { calculateAutomaticFees } from './fees.js'
import {
  OrderValidationError,
  PRICING_COMPONENTS,
  toFiniteNumberOrNull,
} from './orderPrimitives.js'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

function normalizeFeeList(value, description = 'Fees') {
  if (!Array.isArray(value)) throw new OrderValidationError(`${description} must be an array`)

  return value.map((fee) => {
    const amount = toFiniteNumberOrNull(fee?.amount)
    if (!fee || typeof fee !== 'object' || amount === null) {
      throw new OrderValidationError(`${description} must contain finite fee amounts`)
    }

    return { ...fee, amount }
  })
}

function findServiceById(id) {
  if (id === null || id === undefined) return null
  return services.find((service) => String(service.id) === String(id)) || null
}

function parseBoxCalendarDate(value, fieldName) {
  if (isDateOnly(value)) return parseCalendarDate(value, fieldName)
  return formatInTimeZone(parseInstant(value, fieldName), 'yyyy-MM-dd', HELSINKI_TIMEZONE)
}

function calculateBoxPeriod(deliveryDate, returnDate) {
  const delivery = calendarDateToUtc(
    parseBoxCalendarDate(deliveryDate, 'boxes.deliveryDate'),
    'boxes.deliveryDate',
  )
  const returned = calendarDateToUtc(
    parseBoxCalendarDate(returnDate, 'boxes.returnDate'),
    'boxes.returnDate',
  )
  const duration = Math.round((returned.getTime() - delivery.getTime()) / DAY_IN_MILLISECONDS)

  return Math.max(duration, Number(boxesSettings.minPeriod) || 0)
}

function sumFees(feeList) {
  return feeList.reduce((total, fee) => total + fee.amount, 0)
}

function resolveServiceHourlyRate(order) {
  const embeddedService = order?.service
  const catalogService = findServiceById(embeddedService?.id)
  return toFiniteNumberOrNull(catalogService?.pricePerHour ?? embeddedService?.pricePerHour) ?? 0
}

function calculateServiceSubtotal(order) {
  const duration = toFiniteNumberOrNull(order?.duration)
  if (duration === null) return 0
  return resolveServiceHourlyRate(order) * duration
}

function calculateAutomaticBoxesPrice(order) {
  const boxes = order?.boxes
  const amount = toFiniteNumberOrNull(boxes?.amount)
  if (amount === null || amount <= 0) return 0

  const duration = calculateBoxPeriod(boxes?.deliveryDate, boxes?.returnDate)
  const pricePerBox = toFiniteNumberOrNull(boxesSettings.price) ?? 0
  const deliveryFee = toFiniteNumberOrNull(boxesSettings.deliveryFee) ?? 0
  const pickupFee = toFiniteNumberOrNull(boxesSettings.pickupFee) ?? 0

  return amount * pricePerBox * duration + deliveryFee + pickupFee
}

function calculateAutomaticPricing(order) {
  const fees = normalizeFeeList(calculateAutomaticFees(order), 'Automatic fees')
  const boxesPrice = calculateAutomaticBoxesPrice(order)

  return {
    price: calculateServiceSubtotal(order) + boxesPrice + sumFees(fees),
    fees,
    boxesPrice,
  }
}

function getOrderPricing(order) {
  const automatic = calculateAutomaticPricing(order)
  const overrides = order?.pricingOverrides || {}
  const fees = overrides.fees === null || overrides.fees === undefined
    ? automatic.fees
    : normalizeFeeList(overrides.fees, 'Manual fees')
  const boxesPrice = overrides.boxesPrice === null || overrides.boxesPrice === undefined
    ? automatic.boxesPrice
    : toFiniteNumberOrNull(overrides.boxesPrice)

  if (boxesPrice === null) throw new OrderValidationError('Invalid pricingOverrides.boxesPrice')

  const price = overrides.price === null || overrides.price === undefined
    ? automatic.price
    : toFiniteNumberOrNull(overrides.price)

  if (price === null) throw new OrderValidationError('Invalid pricingOverrides.price')

  return { price, fees, boxesPrice }
}

function setPricingOverride(order, component, value) {
  if (!order || typeof order !== 'object') throw new OrderValidationError('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new OrderValidationError(`Unknown pricing component: ${String(component)}`)
  }

  const normalized = component === 'fees'
    ? normalizeFeeList(value, 'Manual fees')
    : toFiniteNumberOrNull(value)
  if (normalized === null) throw new OrderValidationError(`Invalid pricingOverrides.${component}`)

  return {
    ...order,
    pricingOverrides: {
      price: null,
      fees: null,
      boxesPrice: null,
      ...(order.pricingOverrides || {}),
      [component]: normalized,
    },
  }
}

function clearPricingOverride(order, component) {
  if (!order || typeof order !== 'object') throw new OrderValidationError('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new OrderValidationError(`Unknown pricing component: ${String(component)}`)
  }

  return {
    ...order,
    pricingOverrides: {
      price: null,
      fees: null,
      boxesPrice: null,
      ...(order.pricingOverrides || {}),
      [component]: null,
    },
  }
}

function orderTime(order) {
  const date = parseInstant(order?.date, 'order date')
  return formatInTimeZone(date, 'HH:mm', HELSINKI_TIMEZONE)
}

export {
  resolveServiceHourlyRate,
  calculateServiceSubtotal,
  calculateAutomaticBoxesPrice,
  calculateBoxPeriod,
  calculateAutomaticPricing,
  getOrderPricing,
  normalizeFeeList,
  setPricingOverride,
  clearPricingOverride,
  orderTime,
}
