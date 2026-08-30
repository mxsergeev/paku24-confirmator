import fees from '../data/fees.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import { HELSINKI_TIMEZONE, parseDateTime } from './date-fns-tz.js'
import { toFiniteNumberOrNull } from './orderPrimitives.js'

function datePartsInTimezone(value, timezone = HELSINKI_TIMEZONE) {
  let date
  try {
    date = parseDateTime(value, 'date', timezone)
  } catch {
    return null
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  })
    .formatToParts(date)
    .reduce((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value
      return result
    }, {})

  const weekdayNumbers = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  const year = toFiniteNumberOrNull(parts.year)
  const month = toFiniteNumberOrNull(parts.month)
  const day = toFiniteNumberOrNull(parts.day)
  const hour = toFiniteNumberOrNull(parts.hour)

  if (year === null || month === null || day === null || hour === null) return null

  const endOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return {
    hour,
    dayOfWeek: weekdayNumbers[parts.weekday],
    dayOfMonth: day,
    endOfMonth,
  }
}

function getAvailableFees(order) {
  const stairsFeeConfig = fees.find((fee) => fee.name === 'stairsFee')
  const baseFees = fees.filter((fee) => fee.name !== 'stairsFee').map((fee) => ({ ...fee }))

  if (!order || !order.service) return baseFees

  const service = services.find((item) => String(item.id) === String(order.service.id))
  const baseFee = Number(stairsFeeConfig?.baseFee)
  const startFloor = Number(stairsFeeConfig?.startFloor)
  const multiplier = Number(service?.multiplier)
  const floorFees = []

  if (
    !Number.isNaN(baseFee) &&
    !Number.isNaN(startFloor) &&
    !Number.isNaN(multiplier) &&
    multiplier > 0
  ) {
    const addresses = [order.address, order.destination, ...(order.extraAddresses || [])]

    addresses.forEach((address, index) => {
      const floor = toFiniteNumberOrNull(address?.floor)
      if (!address || address.elevator || floor === null || floor < startFloor) return

      const floorsAbove = floor - startFloor
      floorFees.push({
        name: `stairsFee_${index}`,
        label: `KERROSLISÄ ${address.street ? `(${address.street})` : ''}`,
        amount: floorsAbove * baseFee * multiplier,
      })
    })
  }

  return baseFees.concat(floorFees)
}

function calculateAutomaticFees(order) {
  const localDate = datePartsInTimezone(order?.date)
  const hour = localDate?.hour
  const dayOfWeek = localDate?.dayOfWeek
  const dayOfMonth = localDate?.dayOfMonth
  const endOfMonth = localDate?.endOfMonth
  const weekendFeeApplicable = dayOfWeek === 6 || dayOfWeek === 0

  return getAvailableFees(order).filter((fee) => {
    if (fee.name === 'holidayFee') {
      // Currently not implemented
      return false
    }

    if (fee.name === 'weekendFee') {
      return weekendFeeApplicable
    }

    if (fee.name === 'startOrEndOfMonthFee') {
      return !weekendFeeApplicable && [endOfMonth, 1].includes(dayOfMonth)
    }

    if (fee.name === 'nightFee') {
      return hour < 8 || hour >= 20
    }

    if (fee.name === 'paymentTypeFee') {
      const payment = paymentTypes.find(
        (item) => String(item.id) === String(order?.paymentType?.id),
      )
      const paymentFee = payment ? payment.fee : order?.paymentType?.fee
      return Number(paymentFee) > 0
    }

    if (fee.name.startsWith('stairsFee')) {
      return true
    }

    return false
  })
}

export { calculateAutomaticFees, getAvailableFees }
