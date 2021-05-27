/* eslint-disable no-console */
import isJSON from 'validator/es/lib/isJSON'
import fees from '../data/fees.json'
import services from '../data/services.json'
import TextOrder from './TextOrder'
import paymentTypes from '../data/paymentTypes.json'
import distances from '../data/distances.json'

const defaultOrder = {
  dateTime: new Date(),
  duration: 1,
  serviceName: services[0].name,
  paymentType: paymentTypes[0].name,
  address: '',
  destination: '',
  name: '',
  email: '',
  phone: '',
  comment: '',
  distance: distances.insideCapital,
  hsy: false,
  altColorPalette: false,
  XL: false,
}
const orderClassPropertyNames = Object.keys(defaultOrder)

export default class Order {
  constructor(order) {
    for (const propertyName of orderClassPropertyNames) {
      this[propertyName] = order[propertyName] ?? defaultOrder[propertyName]
    }
    this.dateTime = new Date(order.dateTime)
  }

  get time() {
    return this.dateTime.toTimeString().slice(0, 5)
  }

  get servicePrice() {
    const service = services.find((s) => s.name === this.serviceName)
    return this.XL ? service.priceXL : service.price
  }

  get ISODateString() {
    return `${this.dateTime.toISOString().split('T')[0]}T${this.time}`
  }

  get confirmationDateString() {
    let dd = this.dateTime.getDate()
    let mm = this.dateTime.getMonth() + 1
    const yyyy = this.dateTime.getFullYear()

    if (dd < 10) {
      dd = `0${dd}`
    }
    if (mm < 10) {
      mm = `0${mm}`
    }

    return `${dd}-${mm}-${yyyy}`
  }

  get fees() {
    const timeInNumberType = this.time.split(':')[0] * 1

    const dayOFWeek = this.dateTime.getDay()
    const dayOfMonth = this.dateTime.getDate()
    const endOfMonth = [
      new Date(this.dateTime.getFullYear(), this.dateTime.getMonth() + 1, 0).getDate(),
      1,
    ]

    const weekEndFeeApplicable = dayOFWeek === 6 || dayOFWeek === 0
    const endOfMonthFeeApplicable = !weekEndFeeApplicable && endOfMonth.includes(dayOfMonth)
    const morningFeeApplicable = timeInNumberType < 8
    const nightFeeApplicable = timeInNumberType > 20
    const paymentFeeApplicable =
      this.paymentType === 'Lasku' ||
      this.paymentType === 'Lasku/Osamaksu' ||
      this.paymentType === 'Invoice/Instalment payment'

    return [
      weekEndFeeApplicable && fees.weekend,
      endOfMonthFeeApplicable && fees.firstOrLastDayOfTheMonth,
      morningFeeApplicable && fees.morning,
      nightFeeApplicable && fees.night,
      paymentFeeApplicable && fees.bill,
    ].filter((f) => f !== false)
  }

  printFees() {
    const template = '\n@feeName\n@feeAmount'
    // template needs to be as long as the fees array
    let printed = template.repeat(this.fees.length)
    this.fees.forEach((fee) => {
      printed = printed.replace('@feeName', fee.name.toUpperCase())
      printed = printed.replace('@feeAmount', `${fee.amount}€`)
    })

    return printed
  }

  /**
   * Deletes properties hsy, altColorPalette and distance.
   * Transforms to JSON
   */
  prepareForSending() {
    const filtered = this
    delete filtered.hsy
    delete filtered.altColorPalette
    delete filtered.distance
    return JSON.stringify(filtered)
  }

  static getEventForCalendar(formattedStr, startMarker) {
    return formattedStr.slice(formattedStr.indexOf(startMarker))
  }

  static setupOrderFromText(text) {
    return new Promise((resolve) => {
      if (isJSON(text)) {
        resolve(new Order(JSON.parse(text)))
      }

      const orderArguments = {}
      const textOrder = new TextOrder(text)
      for (const propertyName of orderClassPropertyNames) {
        orderArguments[propertyName] = textOrder[propertyName]
      }
      resolve(new Order(orderArguments))
    })
  }

  static default() {
    return new Order(defaultOrder)
  }

  static transformToText(order, notificate) {
    let transformed
    try {
      transformed = `VARAUKSEN TIEDOT
${order.confirmationDateString}
ALKAMISAIKA
Klo ${order.time} (+/-15min)
ARVIOITU KESTO
${order.duration}h (${order.servicePrice}€/h, ${order.serviceName})
MAKSUTAPA
${order.paymentType}${order.printFees()}
LÄHTÖPAIKKA
${order.address}
${order.destination.length > 5 ? `MÄÄRÄNPÄÄ\n${order.destination}\n` : ''}NIMI
${order.name}
${order.email ? `SÄHKÖPOSTI\n${order.email}\n` : ''}PUHELIN
${order.phone}
${order.comment ? `LISÄTIETOJA\n${order.comment}\n` : ''}`
      notificate('Succesefully formatted!')
    } catch (err) {
      console.error(err)
      notificate(err.message)
    }
    return transformed
  }
}
