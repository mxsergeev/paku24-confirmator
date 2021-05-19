/* eslint-disable no-param-reassign */
/* eslint-disable no-control-regex */
/* eslint-disable no-useless-escape */
import services from '../data/services.json'
import paymentTypes from '../data/paymentTypes.json'

function cannotFind(name) {
  return `Cannot find ${name}`
}

export default class TextOrder {
  constructor(textOrder) {
    this.textOrder = TextOrder.initialCleanup(textOrder)
  }

  get dateTime() {
    const dateRe = /(?<=Date and time: \w+, )\w+ \d+(th|rd|st|nd)? \w+/.exec(
      this.textOrder
    )

    if (!dateRe) throw new Error(cannotFind('date'))

    const date = new Date(`${dateRe[0].replace(/th|rd|st|nd/, '')}Z`)
    const time = /\d+:\d+/.exec(this.textOrder)[0]

    const dateTime = new Date(`
    ${date.getFullYear()}
    ${date.getMonth() + 1}
    ${date.getDate()}
    ${time}`)

    return dateTime
  }

  get duration() {
    const duration = /\d+(\.\d+)?(?=\sh.)/.exec(this.textOrder)

    if (!duration) throw new Error(cannotFind('duration'))

    return duration[0]
  }

  get paymentType() {
    const beginMarker = 'Payment Type: '
    const endMarker = 'PRICE'

    const beginIndex = this.textOrder.indexOf(beginMarker) + beginMarker.length
    const endIndex = this.textOrder.indexOf(endMarker)

    const paymentTypeField = this.textOrder.slice(beginIndex, endIndex).trim()

    const nonWordChars = paymentTypeField
      .match(/\W+/g)
      .filter((c) => c !== '/' && c !== ' ' && c !== 'ä')

    const endIndex2 = paymentTypeField.indexOf(nonWordChars[0].trim())

    const paymentType = paymentTypeField.slice(0, endIndex2).trim()

    if (!paymentType) throw new Error(cannotFind('payment type'))

    // does payment type names include our payment type
    if (!paymentTypes.map((p) => p.name).includes(paymentType)) {
      throw new Error('Unrecognized payment type')
    }
    return paymentType
  }

  get movingBoxesPrice() {
    const beginIndex = this.textOrder.indexOf('— Price: ')
    const endIndex = this.textOrder.indexOf('— Booking time start')
    const priceLine = this.textOrder.slice(beginIndex, endIndex)
    const re = /\d+/
    const price = priceLine && priceLine.match(re)[0]
    return price
  }

  get serviceName() {
    const startMarker = 'Service: '
    const endMarker = 'Accessories'
    const fromIndex = this.textOrder.indexOf(startMarker) + startMarker.length
    const endIndex = this.textOrder.indexOf(endMarker)
    const serviceName = this.textOrder.slice(fromIndex, endIndex).trim()

    if (!serviceName) {
      throw new Error(cannotFind('service name'))
    }

    // Check if service with that name exists
    const service = services.find((s) => s.name === serviceName)

    if (!service) throw new Error('Unrecognized service name')

    return serviceName
  }

  get addresses() {
    const beginMarkers = ['Start location:', 'End location:']
    const endMarkers = ['End location', 'Name']
    const addresses = []

    beginMarkers.forEach((marker, index) => {
      const beginIndex = this.textOrder.indexOf(marker) + marker.length
      const endIndex = this.textOrder.indexOf(endMarkers[index])

      const rawAddress = this.textOrder
        .slice(beginIndex, endIndex)
        .replaceAll(',', '')
        .trim()

      const cityField = rawAddress.slice(0, rawAddress.indexOf(' / '))

      // Finnish postal codes are all 5 digits long
      let postalCode = rawAddress.match(/\d{5}/)
      postalCode = (postalCode && postalCode[0]) || ''

      const addressField = rawAddress.slice(rawAddress.indexOf(' / ') + ' / '.length)

      let city = cityField.match(/\D+/)
      city = city && city[0]
      let address = addressField.replace(postalCode, '')
      address = address || null

      const numbersInAddress = /\d+/.test(addressField)

      // User provided address instead of city and city instead of address
      if (
        !numbersInAddress ||
        (addressField.includes(postalCode) && addressField.length < 15)
      ) {
        address = cityField.replace(postalCode, '')
        city = addressField.match(/\D+/)
        city = city && city[0]
      }

      if (address.includes(city)) {
        address = address.replace(city, '')
      }

      if (index === 0 && !address) throw new Error(cannotFind('address'))

      addresses.push(`${address}, ${postalCode} ${city}`.replace(/\s+/g, ' ').trim())
    })

    return addresses
  }

  get address() {
    return this.addresses[0]
  }

  get destination() {
    // destructuring doesn't throw an error if destination is undefined
    const [, destination] = this.addresses
    return destination
  }

  get name() {
    const beginMarker = 'Name: '
    const endMarker = 'Email'

    const beginIndex = this.textOrder.indexOf(beginMarker) + beginMarker.length
    const endIndex = this.textOrder.indexOf(endMarker)

    const name = this.textOrder.slice(beginIndex, endIndex).trim()

    if (!name) throw new Error(cannotFind('name'))

    return name
  }

  get email() {
    // regex from internet
    const email = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.exec(
      this.textOrder
    )

    if (!email) throw new Error(cannotFind('email'))

    return email[0]
  }

  get phone() {
    // regex from internet
    const phone = /(?<=Phone: )[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*/.exec(
      this.textOrder
    )

    if (!phone) throw new Error(cannotFind('phone'))

    return phone[0].trim()
  }

  get comment() {
    let comment = /(?<=Comment: )(.*\s*)*/.exec(this.textOrder)
    comment = comment ? comment[0] : ''

    const re = /\n\n\-\-\nTämä viesti lähetettiin sivustolta Paku24\.fi \(https:\/\/paku24\.fi\)/
    const footer = re.exec(comment)

    if (footer) {
      comment = comment.replace(re, '')
    }

    return comment
  }

  // get vanSize() {

  // }

  static initialCleanup(str) {
    const splitStr = str.split('\n')
    const noRebundantWhitespace = []
    splitStr.forEach((line) => noRebundantWhitespace.push(line.trim()))
    const string = noRebundantWhitespace
      .join('\n')
      .replaceAll('————————', '')
      .replaceAll('------------------------', '')

    return string
  }
}
