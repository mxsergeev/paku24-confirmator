import {
  HELSINKI_TIMEZONE,
  formatInTimeZone,
  isDateOnly,
  parseCalendarDate,
  parseInstant,
} from '../date-fns-tz.js'
import { getOrderPricing, resolveServiceHourlyRate } from '../orderPricing.js'
import { resolveFeeDisplayName } from './fees.js'

function formatAddress(address) {
  let result = ''
  if (!address) return result
  result += address.street || ''
  if (address.index || address.city) {
    result += (', ' + (address.index || '') + ' ' + (address.city || '')).trim()
  }

  const floorInfo = []
  if (typeof address.floor !== 'undefined' && address.floor !== null && address.floor !== '') {
    floorInfo.push(address.floor + ' krs.')
  }
  if (address.elevator) {
    floorInfo.push('hissi')
  }
  if (floorInfo.length > 0) {
    result += '\n' + floorInfo.join(', ')
  }
  result += '\n'
  return result
}

function formatAddressLocation(address) {
  if (!address) return ''
  let result = ''
  result += address.street || ''
  if (address.index || address.city) {
    result += (', ' + (address.index || '') + ' ' + (address.city || '')).trim()
  }
  result += '\n'
  return result
}

function formatOrderDate(value, format, fieldName) {
  const date = parseInstant(value, fieldName)
  return formatInTimeZone(date, format, HELSINKI_TIMEZONE)
}

function formatBoxDate(value, fieldName) {
  if (isDateOnly(value)) {
    parseCalendarDate(value, fieldName)
    const [year, month, day] = value.split('-')
    return day + '-' + month + '-' + year
  }

  const date = parseInstant(value, fieldName)
  return formatInTimeZone(date, 'dd-MM-yyyy HH:mm', HELSINKI_TIMEZONE)
}

function serviceName(order) {
  return order.serviceName ?? order.service?.name
}

function formatFees(order, pricing) {
  return pricing.fees
    .map((fee) => resolveFeeDisplayName(order, fee).toUpperCase() + '\n' + fee.amount + '€\n')
    .join('')
}

function formatBoxes(order, pricing, showHeading) {
  if (!order.boxes || order.boxes.amount <= 0) return ''

  const deliveryDate = formatBoxDate(order.boxes.deliveryDate, 'box delivery date')
  const returnDate = formatBoxDate(order.boxes.returnDate, 'box return date')
  const heading = showHeading ? 'MUUTTOLAATIKOT\n' : ''

  return heading +
    deliveryDate + ' - ' + returnDate + '\n' +
    'Määrä: ' + order.boxes.amount + ' kpl\n' +
    'Hinta: ' + pricing.boxesPrice + '€\n'
}

function formatContactDetails(order) {
  return 'NIMI\n' + (order.name || '?') + '\n' +
    'SÄHKÖPOSTI\n' + (order.email || '?') + '\n' +
    'PUHELIN\n' + (order.phone || '?') + '\n'
}

function formatExtraAddresses(order) {
  if (!order.extraAddresses || order.extraAddresses.length === 0) return ''
  return 'LISÄPYSÄHDYKSET\n' + order.extraAddresses.map(formatAddress).join('')
}

function formatDestination(order) {
  if (!order.destination || !order.destination.street || order.destination.street.length <= 5) return ''
  return 'MÄÄRÄNPÄÄ\n' + formatAddress(order.destination)
}

function formatComment(order) {
  const address = order.address || {}
  const destination = order.destination || {}
  let result = 'LISÄTIETOJA\n'

  if (address.floor || address.elevator) {
    result += 'Lähtö: ' + address.floor + ' krs.' +
      (address.elevator ? ', hissi on.' : ', ei hissiä.') + '\n'
  }
  if (destination.floor || destination.elevator) {
    result += 'Määränpää: ' + destination.floor + ' krs.' +
      (destination.elevator ? ', hissi on.' : ', ei hissiä.') + '\n'
  }

  return result + order.comment + '\n'
}

function formatOrderForSms(order) {
  const pricing = getOrderPricing(order)
  let result = 'VARAUKSEN TIEDOT\n'

  result += formatOrderDate(order.date, 'yyyy-MM-dd', 'order date') + '\n'
  result += 'ALKAMISAIKA\n'
  result += 'Klo ' + formatOrderDate(order.date, 'HH:mm', 'order date') + ' (+/-15min)\n'
  result += 'ARVIOITU KESTO\n'
  result += order.duration + 'h (' + resolveServiceHourlyRate(order) + '€/h, ' + serviceName(order) + ')\n'
  result += 'MAKSUTAPA\n' + order.paymentType.name + '\n'
  result += formatFees(order, pricing)
  result += formatBoxes(order, pricing, true)
  result += 'ARVIOITU HINTA\n' + pricing.price + '€\n'
  result += 'LÄHTÖPAIKKA\n' + formatAddress(order.address)
  result += formatExtraAddresses(order)
  result += formatDestination(order)
  result += formatContactDetails(order)
  result += formatComment(order)

  return result
}

function formatMoveCalendarDescription(order) {
  const pricing = getOrderPricing(order)
  let result = formatFees(order, pricing)

  result += formatBoxes(order, pricing, false)
  result += 'ARVIOITU HINTA\n' + pricing.price + '€\n'
  result += 'LÄHTÖPAIKKA\n' + formatAddress(order.address)
  result += formatExtraAddresses(order)
  result += formatDestination(order)
  result += formatContactDetails(order)
  result += formatComment(order)

  return result
}

function formatBoxCalendarDescription(order, location) {
  const pricing = getOrderPricing(order)
  let result = formatBoxes(order, pricing, false)

  result += 'ARVIOITU HINTA\n' + pricing.price + '€\n'
  if (location === 'delivery') result += 'LÄHTÖPAIKKA\n' + formatAddress(order.address)
  if (location === 'return') result += formatDestination(order)
  result += formatContactDetails(order)

  return result
}

function formatBoxDeliveryCalendarDescription(order) {
  return formatBoxCalendarDescription(order, 'delivery')
}

function formatBoxReturnCalendarDescription(order) {
  return formatBoxCalendarDescription(order, 'return')
}

export {
  formatAddress,
  formatAddressLocation,
  formatBoxDate,
  formatOrderForSms,
  formatMoveCalendarDescription,
  formatBoxDeliveryCalendarDescription,
  formatBoxReturnCalendarDescription,
}
