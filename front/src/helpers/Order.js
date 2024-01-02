/* eslint-disable no-console */
import { enqueueSnackbar } from 'notistack'
import isJSON from 'validator/es/lib/isJSON'
import dayjs from 'dayjs'
import fees from '../data/fees.json'
import services from '../data/services.json'
import TextOrder from './TextOrder'
import paymentTypes from '../data/paymentTypes.json'
import distances from '../data/distances.json'
import boxesSettings from '../data/boxes.json'
import icons from '../data/icons.json'

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
  boxesDeliveryDate: new Date().toISOString(),
  boxesPickupDate: new Date().toISOString(),
  boxesAmount: 0,
  selfPickup: false,
  selfReturn: false,
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

  get boxesPrice() {
    const duration = dayjs(this.boxesPickupDate).diff(
      dayjs(this.boxesDeliveryDate),
      boxesSettings.timeUnit
    )

    let price = this.boxesAmount * boxesSettings.price * duration

    if (!this.selfPickup) {
      price += boxesSettings.deliveryFee
    }
    if (!this.selfReturn) {
      price += boxesSettings.pickupFee
    }

    return price
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
    const nightFeeApplicable = timeInNumberType >= 20
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
        try {
          orderArguments[propertyName] = textOrder[propertyName]
        } catch (err) {
          enqueueSnackbar(err.message, { variant: 'error' })

          orderArguments[propertyName] = null
        }
      }

      resolve(new Order(orderArguments))
    })
  }

  static default() {
    return new Order(defaultOrder)
  }

  makeIcons() {
    const sizeIcon = this.XL ? icons.size.XL : ''
    const distanceIcon = icons.misc[this.distance] || ''
    const feeIcons = this.fees
      .map((fee) => {
        if (fee.name === 'Laskulisä') return ''

        return icons.fees[fee.name]
      })
      .reduce((acc, cur) => acc + cur, '')
    const serviceIcons = icons.service[this.serviceName]
    const paymentIcons = icons.payment[this.paymentType]

    return {
      move: `${sizeIcon}${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}`,
      boxesDelivery: icons.boxes.delivery,
      boxesPickup: icons.boxes.pickup,
    }
  }

  makeCalendarEntries() {
    const moveTitle = `${this.makeIcons().move}${this.time}(${this.duration}h)`

    const boxesDeliveryTitle = `${this.boxesAmount} ${this.makeIcons().boxesDelivery} ${
      this.boxesDeliveryDate.includes('T')
        ? `${dayjs(this.boxesDeliveryDate).format('HH:mm')} `
        : ''
    }`

    const boxesPickupTitle = `NOUTO ${this.boxesAmount} ${this.makeIcons().boxesPickup} ${
      this.boxesPickupDate.includes('T') ? `${dayjs(this.boxesPickupDate).format('HH:mm')} ` : ''
    }`

    return {
      move: {
        title: `${moveTitle} ${this.name}`,
        description: `${moveTitle}${this.format(
          {
            title: 0,
            date: 0,
            time: 0,
            duration: 0,
            paymentType: 0,
          },
          { removeFirstHeading: true }
        )}`,
      },
      boxesDelivery: {
        title: `${boxesDeliveryTitle}${this.name}`,
        description: `${boxesDeliveryTitle}${this.format(
          {
            address: 1,
            name: 1,
            email: 1,
            phone: 1,
            boxes: 1,
          },
          { removeFirstHeading: true }
        )}`,
      },
      boxesPickup: {
        title: `${boxesPickupTitle}${this.name}`,
        description: `${boxesPickupTitle}${this.format(
          {
            destination: 1,
            name: 1,
            email: 1,
            phone: 1,
            boxes: 1,
          },
          { removeFirstHeading: true }
        )}`,
      },
    }
  }

  format(opts = {}, { removeFirstHeading = false } = {}) {
    const defaultOpts = {
      title: 1,
      date: 1,
      time: 1,
      duration: 1,
      paymentType: 1,
      address: 1,
      destination: 1,
      name: 1,
      email: 1,
      phone: 1,
      boxes: 1,
      comment: 1,
    }

    let options = defaultOpts

    // Include only selected fields
    if (Object.keys(opts).length > 0 && Object.values(opts).includes(1)) {
      options = opts
    }
    // Do not include selected fields but include the rest
    else if (Object.values(opts).includes(0)) {
      options = {
        ...defaultOpts,
        ...opts,
      }
    }

    let transformed = ''

    try {
      if (options.title) {
        transformed += 'VARAUKSEN TIEDOT\n'
      }
      if (options.date) {
        transformed += `${this.confirmationDateString}\n`
      }
      if (options.time) {
        transformed += 'ALKAMISAIKA\n'
        transformed += `Klo ${this.time} (+/-15min)\n`
      }
      if (options.duration) {
        transformed += 'ARVIOITU KESTO\n'
        transformed += `${this.duration}h (${this.servicePrice}€/h, ${this.serviceName})\n`
      }
      if (options.paymentType) {
        transformed += 'MAKSUTAPA\n'
        transformed += `${this.paymentType}${this.printFees()}\n`
      }
      if (options.address) {
        transformed += 'LÄHTÖPAIKKA\n'
        transformed += `${this.address}\n`
      }
      if (options.destination && this.destination.length > 5) {
        transformed += 'MÄÄRÄNPÄÄ\n'
        transformed += `${this.destination}\n`
      }
      if (options.name) {
        transformed += 'NIMI\n'
        transformed += `${this.name}\n`
      }
      if (options.email && this.email) {
        transformed += 'SÄHKÖPOSTI\n'
        transformed += `${this.email}\n`
      }
      if (options.phone) {
        transformed += 'PUHELIN\n'
        transformed += `${this.phone}\n`
      }

      if (options.boxes && this.boxesAmount > 0) {
        const boxDelDateStr = dayjs(this.boxesDeliveryDate).format(
          `DD-MM-YYYY ${this.boxesDeliveryDate.includes('T') ? 'HH:mm' : ''}`
        )
        const boxPickDateStr = dayjs(this.boxesPickupDate).format(
          `DD-MM-YYYY ${this.boxesPickupDate.includes('T') ? 'HH:mm' : ''}`
        )

        transformed += 'MUUTTOLAATIKOT\n'
        transformed += `${boxDelDateStr} - ${boxPickDateStr}\n`
        if (this.selfPickup) transformed += 'Itse nouto\n'
        if (this.selfReturn) transformed += 'Itse palautus\n'
        transformed += `Määrä: ${this.boxesAmount} kpl\n`
        transformed += `Hinta: ${this.boxesPrice}€\n`
      }

      if (options.comment && this.comment) {
        transformed += 'LISÄTIETOJA\n'
        transformed += `${this.comment}\n`
      }

      if (removeFirstHeading) {
        const ar = transformed.split('\n')
        ar.shift()

        transformed = ar.join('\n')
      }
    } catch (err) {
      console.error(err)
    }

    return transformed
  }
}
