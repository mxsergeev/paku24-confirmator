import fees from '../../data/fees.json' with { type: 'json' }
import {
  HELSINKI_TIMEZONE,
  formatInTimeZone,
  isDateOnly,
  parseCalendarDate,
  parseInstant,
} from '../date-fns-tz.js'

function formatAddress(address) {
  let result = ''
  if (!address) return result
  result += address.street || ''
  if (address.index || address.city) {
    result += `, ${address.index || ''} ${address.city || ''}`.trim()
  }

  const floorInfo = []
  if (typeof address.floor !== 'undefined' && address.floor !== null && address.floor !== '') {
    floorInfo.push(`${address.floor} krs.`)
  }
  if (address.elevator) {
    floorInfo.push('hissi')
  }
  if (floorInfo.length > 0) {
    result += `\n${floorInfo.join(', ')}`
  }
  result += '\n'
  return result
}

function formatAddressLocation(address) {
  if (!address) return ''
  let result = ''
  result += address.street || ''
  if (address.index || address.city) {
    result += `, ${address.index || ''} ${address.city || ''}`.trim()
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
    return `${day}-${month}-${year}`
  }

  const date = parseInstant(value, fieldName)
  return formatInTimeZone(date, 'dd-MM-yyyy HH:mm', HELSINKI_TIMEZONE)
}

function servicePrice(order) {
  return order.servicePrice ?? Number(order.service?.pricePerHour) * Number(order.duration)
}

function serviceName(order) {
  return order.serviceName ?? order.service?.name
}

const SECTION_NAMES = [
  'title',
  'date',
  'time',
  'duration',
  'paymentType',
  'fees',
  'boxes',
  'price',
  'address',
  'extraAddresses',
  'destination',
  'name',
  'email',
  'phone',
  'comment',
]

function selectedSections(options) {
  const included = Object.entries(options)
    .filter(([, value]) => value === true || value === 1)
    .map(([name]) => name)

  if (included.length > 0) return new Set(included)

  const selected = new Set(SECTION_NAMES)
  Object.entries(options).forEach(([name, value]) => {
    if (value === false || value === 0 || value === null) selected.delete(name)
  })
  return selected
}

function formatOrder(order, options = {}, { showBoxesHeading = true } = {}) {
  const sections = selectedSections(options)

  let transformed = ''

  if (sections.has('title')) {
    transformed += 'VARAUKSEN TIEDOT\n'
  }
  if (sections.has('date')) {
    transformed += `${formatOrderDate(order.date, 'yyyy-MM-dd', 'order date')}\n`
  }
  if (sections.has('time')) {
    transformed += 'ALKAMISAIKA\n'
    transformed += `Klo ${formatOrderDate(order.date, 'HH:mm', 'order date')} (+/-15min)\n`
  }
  if (sections.has('duration')) {
    transformed += 'ARVIOITU KESTO\n'
    transformed += `${order.duration}h (${servicePrice(order)}€/h, ${serviceName(order)})\n`
  }
  if (sections.has('paymentType')) {
    transformed += 'MAKSUTAPA\n'
    transformed += `${order.paymentType.name}\n`
  }
  if (sections.has('fees')) {
    ;(order.fees || []).forEach((fee) => {
      const label = fee.label ?? fees.find((item) => item.name === fee.name)?.label ?? ''

      transformed += `${label.toUpperCase()}\n`
      transformed += `${fee.amount}€\n`
    })
  }
  if (sections.has('boxes') && order.boxes && order.boxes.amount > 0) {
    const boxDelDateStr = formatBoxDate(order.boxes.deliveryDate, 'box delivery date')
    const boxPickDateStr = formatBoxDate(order.boxes.returnDate, 'box return date')

    if (showBoxesHeading) {
      transformed += 'MUUTTOLAATIKOT\n'
    }
    transformed += `${boxDelDateStr} - ${boxPickDateStr}\n`
    transformed += `Määrä: ${order.boxes.amount} kpl\n`
    transformed += `Hinta: ${order.boxesPrice}€\n`
  }
  if (sections.has('price')) {
    transformed += 'ARVIOITU HINTA\n'
    transformed += `${order.price}€\n`
  }
  if (sections.has('address')) {
    transformed += 'LÄHTÖPAIKKA\n'
    transformed += formatAddress(order.address)
  }
  if (
    sections.has('extraAddresses') &&
    order.extraAddresses &&
    order.extraAddresses.length > 0
  ) {
    transformed += 'LISÄPYSÄHDYKSET\n'
    order.extraAddresses.forEach((address) => {
      transformed += formatAddress(address)
    })
  }
  if (
    sections.has('destination') &&
    order.destination &&
    order.destination.street &&
    order.destination.street.length > 5
  ) {
    transformed += 'MÄÄRÄNPÄÄ\n'
    transformed += formatAddress(order.destination)
  }
  if (sections.has('name')) {
    transformed += 'NIMI\n'
    transformed += `${order.name || '?'}\n`
  }
  if (sections.has('email')) {
    transformed += 'SÄHKÖPOSTI\n'
    transformed += `${order.email || '?'}\n`
  }
  if (sections.has('phone')) {
    transformed += 'PUHELIN\n'
    transformed += `${order.phone || '?'}\n`
  }

  if (sections.has('comment')) {
    transformed += 'LISÄTIETOJA\n'
    const address = order.address || {}
    const destination = order.destination || {}

    if (address.floor || address.elevator) {
      transformed += `Lähtö: ${address.floor} krs.${
        address.elevator ? ', hissi on.' : ', ei hissiä.'
      }\n`
    }

    if (destination.floor || destination.elevator) {
      transformed += `Määränpää: ${destination.floor} krs.${
        destination.elevator ? ', hissi on.' : ', ei hissiä.'
      }\n`
    }

    transformed += `${order.comment}\n`
  }

  return transformed
}

export { formatAddress, formatAddressLocation, formatBoxDate, formatOrder }
