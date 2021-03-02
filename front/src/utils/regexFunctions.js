/* eslint-disable no-control-regex */
/* eslint-disable no-useless-escape */
import services from './services.json'
import calculateFees from './helpers/calculateFees'
import * as helpers from './helpers/regexHelpers'

export async function getEventForCalendar(formattedStr, address) {
  const startingIndex = formattedStr.indexOf(address)
  const event = formattedStr.slice(startingIndex)

  return event
}

export function getStartingTime(str) {
  const dateRegex = /(?<=Date end time: \w+, )\w+ \d+(th|rd|st|nd)? \w+/.exec(
    str
  )

  if (!dateRegex) throw new Error(helpers.cannotFind('date'))

  const original = new Date(`${dateRegex[0].replace(/th|rd|st|nd/, '')}Z`)
  const ISODate = original.toISOString().split('T')[0]
  const confirmationFormat = helpers.toConfirmationDateFormat(original)

  const time = /\d+:\d+/.exec(str)[0]

  return { confirmationFormat, original, ISODate, time }
}

export function getDuration(str) {
  const duration = /\d+(\.\d+)?(?=\sh.)/.exec(str)

  if (!duration) throw new Error(helpers.cannotFind('duration'))

  return duration[0]
}

export function getPaymentType(str) {
  const paymentType = /(?<=Payment Type: )[A-Öa-ö]+/.exec(str)

  if (!paymentType) throw new Error(helpers.cannotFind('payment type'))

  return paymentType[0]
}

export function getFees(str) {
  const date = getStartingTime(str).original
  const { time } = getStartingTime(str)
  const paymentType = getPaymentType(str)

  return calculateFees(date, time, paymentType)
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

  const duration = getDuration(str)

  const service = services.filter((s) => s.price === price / duration)

  if (service.length === 0)
    throw new Error('Cannot recognize service. Invalid price or duration.')

  return service[0]
}

export function getAddress(str, course) {
  let city = new RegExp(`(?<=${course}: )[A-Öa-ö]+`).exec(str)
  city = city ? city[0] : ''

  let address = new RegExp(`(?<=${course}: ${city} / ).*(?=,*)`).exec(str)
  address = address ? `${address[0]},` : ''

  if (course === 'Frome' && !address)
    throw new Error(helpers.cannotFind('address'))

  return { address, city }
}

export function getName(str) {
  const name = /(?<=Name: )([A-Öa-ö]+ *)+/.exec(str)

  if (!name) throw new Error(helpers.cannotFind('name'))

  return name[0]
}

export function getEmail(str) {
  const email = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.exec(
    str
  )

  if (!email) throw new Error(helpers.cannotFind('email'))

  return email[0]
}

export function getPhone(str) {
  const phone = /(?<=Phone: )[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*/.exec(
    str
  )

  if (!phone) throw new Error(helpers.cannotFind('phone'))

  return phone[0].replace(/\n/, '')
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
