import boxesSettings from '../data/boxes.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import {
  HELSINKI_TIMEZONE,
  calendarDateToUtc,
  formatInTimeZone,
  parseInstant,
} from './date-fns-tz.js'
import { calculateAutomaticFees } from './fees.js'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const PRICING_COMPONENTS = ['price', 'fees', 'boxesPrice']

function finiteNumberOrNull(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeFeeList(value, description = 'Fees') {
  if (!Array.isArray(value)) throw new Error(`${description} must be an array`)

  return value.map((fee) => {
    const amount = finiteNumberOrNull(fee?.amount)
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

function parseBoxCalendarDate(value, fieldName) {
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
  return finiteNumberOrNull(catalogService?.pricePerHour ?? embeddedService?.pricePerHour) ?? 0
}

function calculateServiceSubtotal(order) {
  const duration = finiteNumberOrNull(order?.duration)
  if (duration === null) return 0
  return resolveServiceHourlyRate(order) * duration
}

function calculateAutomaticBoxesPrice(order) {
  const boxes = order?.boxes
  const amount = finiteNumberOrNull(boxes?.amount)
  if (amount === null || amount <= 0) return 0
  if (!boxes.deliveryDate || !boxes.returnDate) return 0

  const duration = calculateBoxPeriod(boxes.deliveryDate, boxes.returnDate)
  const pricePerBox = finiteNumberOrNull(boxesSettings.price) ?? 0
  const deliveryFee = finiteNumberOrNull(boxesSettings.deliveryFee) ?? 0
  const pickupFee = finiteNumberOrNull(boxesSettings.pickupFee) ?? 0

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
    : finiteNumberOrNull(overrides.boxesPrice)

  if (boxesPrice === null) throw new Error('Invalid pricingOverrides.boxesPrice')

  const price = overrides.price === null || overrides.price === undefined
    ? calculateServiceSubtotal(order) + boxesPrice + sumFees(fees)
    : finiteNumberOrNull(overrides.price)

  if (price === null) throw new Error('Invalid pricingOverrides.price')

  return { price, fees, boxesPrice }
}

function setPricingOverride(order, component, value) {
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new Error(`Unknown pricing component: ${String(component)}`)
  }

  const normalized = component === 'fees' ? normalizeFeeList(value, 'Manual fees') : finiteNumberOrNull(value)
  if (normalized === null) throw new Error(`Invalid pricingOverrides.${component}`)

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
  if (!order || typeof order !== 'object') throw new Error('Order must be an object')
  if (!PRICING_COMPONENTS.includes(component)) {
    throw new Error(`Unknown pricing component: ${String(component)}`)
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
