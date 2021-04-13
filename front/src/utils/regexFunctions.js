/* eslint-disable no-param-reassign */
/* eslint-disable no-control-regex */
/* eslint-disable no-useless-escape */
import services from './services.json'
import calculateFees from './helpers/calculateFees'
import * as helpers from './helpers/regexHelpers'

export function initialCleanup(str) {
  const splitStr = str.split('\n')
  const noRebundantWhitespace = []
  splitStr.forEach((line) => noRebundantWhitespace.push(line.trim()))
  const string = noRebundantWhitespace
    .join('\n')
    .replaceAll('————————', '')
    .replaceAll('------------------------', '')

  return string
}

export async function getEventForCalendar(formattedStr, address) {
  const startingIndex = formattedStr.indexOf(address)
  const event = formattedStr.slice(startingIndex)

  return event
}

export function getStartingTime(str) {
  const dateRe = /(?<=Date and time: \w+, )\w+ \d+(th|rd|st|nd)? \w+/.exec(str)

  if (!dateRe) throw new Error(helpers.cannotFind('date'))

  const date = new Date(`${dateRe[0].replace(/th|rd|st|nd/, '')}Z`)
  const time = /\d+:\d+/.exec(str)[0]

  const original = new Date(`
    ${date.getFullYear()}
    ${date.getMonth() + 1}
    ${date.getDate()}
    ${time}`)
  const ISODate = original.toISOString().split('T')[0]
  const confirmationFormat = helpers.toConfirmationDateFormat(original)

  return { confirmationFormat, original, ISODate, time }
}

export function getDuration(str) {
  const duration = /\d+(\.\d+)?(?=\sh.)/.exec(str)

  if (!duration) throw new Error(helpers.cannotFind('duration'))

  return duration[0]
}

export function getPaymentType(str) {
  const beginMarker = 'Payment Type: '
  const endMarker = 'PRICE'

  const beginIndex = str.indexOf(beginMarker) + beginMarker.length
  const endIndex = str.indexOf(endMarker)

  const paymentTypeField = str.slice(beginIndex, endIndex).trim()

  const nonWordChars = paymentTypeField
    .match(/\W+/g)
    .filter((c) => c !== '/' && c !== ' ' && c !== 'ä')

  const endIndex2 = paymentTypeField.indexOf(nonWordChars[0].trim())

  const paymentType = paymentTypeField.slice(0, endIndex2).trim()

  if (!paymentType) throw new Error(helpers.cannotFind('payment type'))

  return paymentType
}

export function getFees(str) {
  const date = getStartingTime(str).original
  const { time } = getStartingTime(str)
  const paymentType = getPaymentType(str)

  return calculateFees(date, time, paymentType)
}

export function getMovingBoxes(str) {
  const beginIndex = str.indexOf('— Price: ')
  const endIndex = str.indexOf('— Booking time start')
  const priceLine = str.slice(beginIndex, endIndex)
  const re = /\d+/
  const price = priceLine && priceLine.match(re)[0]
  return price
}

export function getService(str) {
  let price = /(?<=PRICE: )\d+/.exec(str)

  if (!price) {
    throw new Error(helpers.cannotFind('price'))
  }

  ;[price] = price

  getFees(str)
    .filter((fee) => fee.value)
    .forEach((fee) => {
      price -= fee.value
      return price
    })

  const priceForBoxes = getMovingBoxes(str)
  console.log(priceForBoxes)

  price -= priceForBoxes

  const duration = getDuration(str)

  const service = services.filter((s) => s.price === price / duration)

  if (service.length === 0)
    throw new Error('Cannot recognize service. Invalid price or duration.')

  return service[0]
}

export function getAddress(str, course) {
  const beginMarker = `${course}: `
  const endMarker = course === 'Start location' ? 'End location' : 'Name'

  const beginIndex = str.indexOf(beginMarker) + beginMarker.length
  const endIndex = str.indexOf(endMarker)

  const rawAddress = str.slice(beginIndex, endIndex).replaceAll(',', '').trim()

  const cityField = rawAddress.slice(0, rawAddress.indexOf(' / '))

  // Finnish postal codes are all 5 digits long
  let postalCode = rawAddress.match(/\d{5}/)
  postalCode = postalCode && postalCode[0]

  const addressField = rawAddress.slice(
    rawAddress.indexOf(' / ') + ' / '.length
  )

  let city = cityField.match(/\D+/)
  city = city && city[0].trim()
  let address = addressField.replace(postalCode, '').trim()
  address = address || null

  const numbersInAddress = /\d+/.test(addressField)

  // User provided address instead of city and city instead of address
  if (
    !numbersInAddress ||
    (addressField.includes(postalCode) && addressField.length < 15)
  ) {
    address = cityField.replace(postalCode, '').trim()
    city = addressField.match(/\D+/)
    city = city && city[0].trim()
  }

  if (address.includes(city)) {
    address = address.replace(city, '').trim()
  }

  if (course === 'Start location' && !address)
    throw new Error(helpers.cannotFind('address'))

  return { address, city, postalCode }
}

export function getName(str) {
  const beginMarker = 'Name: '
  const endMarker = 'Email'

  const beginIndex = str.indexOf(beginMarker) + beginMarker.length
  const endIndex = str.indexOf(endMarker)

  const name = str.slice(beginIndex, endIndex).trim()

  if (!name) throw new Error(helpers.cannotFind('name'))

  return name
}

export function getEmail(str) {
  // regex from internet
  const email = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.exec(
    str
  )

  if (!email) throw new Error(helpers.cannotFind('email'))

  return email[0]
}

export function getPhone(str) {
  // regex from internet
  const phone = /(?<=Phone: )[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*/.exec(
    str
  )

  if (!phone) throw new Error(helpers.cannotFind('phone'))

  return phone[0].trim()
}

export function getComment(str) {
  let comment = /(?<=Comment: )(.*\s*)*/.exec(str)
  comment = comment ? comment[0] : ''

  const re = /\n\n\-\-\nTämä viesti lähetettiin sivustolta Paku24\.fi \(https:\/\/paku24\.fi\)/
  const footer = re.exec(comment)

  if (footer) {
    comment = comment.replace(re, '')
  }

  return comment
}
