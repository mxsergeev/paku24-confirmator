import fees from '../../data/fees.json' with { type: 'json' }
import dayjs from '../dayjs.js'
import { toZonedTime } from '../date-fns-tz.js'
import { isNode } from '../isNode.js'

const getDateInTz = (date) => (isNode() ? toZonedTime(date) : date)

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

function formatBoxDate(value) {
  const dateOnly = typeof value === 'string' && !value.includes('T')
  const date = dateOnly ? value : getDateInTz(value)

  return dayjs(date).format(`DD-MM-YYYY ${dateOnly ? '' : 'HH:mm'}`)
}

function servicePrice(order) {
  return order.servicePrice ?? Number(order.service?.pricePerHour) * Number(order.duration)
}

function serviceName(order) {
  return order.serviceName ?? order.service?.name
}

function formatOrder(order, opts = {}, { removeFirstHeading = false } = {}) {
  const defaultOpts = {
    title: 1,
    date: 1,
    time: 1,
    duration: 1,
    paymentType: 1,
    fees: 1,
    address: 1,
    extraAddresses: 1,
    destination: 1,
    name: 1,
    email: 1,
    phone: 1,
    boxes: 1,
    comment: 1,
  }

  let options = defaultOpts

  // Include only selected fields.
  if (Object.keys(opts).length > 0 && Object.values(opts).includes(1)) {
    options = opts
  } else if (Object.values(opts).includes(0)) {
    options = {
      ...defaultOpts,
      ...opts,
    }
  }

  let transformed = ''

  if (options.title) {
    transformed += 'VARAUKSEN TIEDOT\n'
  }
  if (options.date) {
    transformed += `${dayjs(getDateInTz(order.date)).format('YYYY-MM-DD')}\n`
  }
  if (options.time) {
    transformed += 'ALKAMISAIKA\n'
    transformed += `Klo ${dayjs(getDateInTz(order.date)).format('HH:mm')} (+/-15min)\n`
  }
  if (options.duration) {
    transformed += 'ARVIOITU KESTO\n'
    transformed += `${order.duration}h (${servicePrice(order)}€/h, ${serviceName(order)})\n`
  }
  if (options.paymentType) {
    transformed += 'MAKSUTAPA\n'
    transformed += `${order.paymentType.name}\n`
  }
  if (options.fees) {
    ;(order.fees || []).forEach((fee) => {
      const label = fee.label ?? fees.find((item) => item.name === fee.name)?.label ?? ''

      transformed += `${label.toUpperCase()}\n`
      transformed += `${fee.amount}€\n`
    })
  }
  if (options.boxes && order.boxes && order.boxes.amount > 0) {
    const boxDelDateStr = formatBoxDate(order.boxes.deliveryDate)
    const boxPickDateStr = formatBoxDate(order.boxes.returnDate)

    transformed += 'MUUTTOLAATIKOT\n'
    transformed += `${boxDelDateStr} - ${boxPickDateStr}\n`
    transformed += `Määrä: ${order.boxes.amount} kpl\n`
    transformed += `Hinta: ${order.boxesPrice}€\n`
  }
  if (options.price !== null) {
    transformed += 'ARVIOITU HINTA\n'
    transformed += `${order.price}€\n`
  }
  if (options.address) {
    transformed += 'LÄHTÖPAIKKA\n'
    transformed += formatAddress(order.address)
  }
  if (options.extraAddresses && order.extraAddresses && order.extraAddresses.length > 0) {
    transformed += 'LISÄPYSÄHDYKSET\n'
    order.extraAddresses.forEach((address) => {
      transformed += formatAddress(address)
    })
  }
  if (
    options.destination &&
    order.destination &&
    order.destination.street &&
    order.destination.street.length > 5
  ) {
    transformed += 'MÄÄRÄNPÄÄ\n'
    transformed += formatAddress(order.destination)
  }
  if (options.name) {
    transformed += 'NIMI\n'
    transformed += `${order.name || '?'}\n`
  }
  if (options.email) {
    transformed += 'SÄHKÖPOSTI\n'
    transformed += `${order.email || '?'}\n`
  }
  if (options.phone) {
    transformed += 'PUHELIN\n'
    transformed += `${order.phone || '?'}\n`
  }

  if (options.comment) {
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

  if (removeFirstHeading) {
    const lines = transformed.split('\n')
    lines.shift()
    transformed = lines.join('\n')
  }

  return transformed
}

export { formatAddress, formatAddressLocation, formatOrder }
