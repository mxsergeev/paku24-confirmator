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

export default class Order {
  static EMPTY_ORDER = {
    distance: distances.insideCapital,
    hsy: false,
    XL: false,
    eventColor: null,
    initialFees: [],
    manualFees: [],
    manualBoxesPrice: null,
    initialPrice: null,
    manualPrice: null,

    date: new Date(),
    duration: 1,
    service: {
      id: '1',
      name: services[0].name,
      pricePerHour: Number(services[0].price),
    },
    paymentType: {
      id: '1',
      name: paymentTypes[0].name,
      fee: Number(paymentTypes[0].fee) || 0,
    },
    address: {
      street: '',
      index: '',
      city: '',
      floor: 0,
      elevator: false,
    },
    extraAddresses: [],
    destination: {
      street: '',
      index: '',
      city: '',
      floor: 0,
      elevator: false,
    },
    name: '',
    email: '',
    phone: '',
    boxes: {
      returnDate: new Date().toISOString(),
      deliveryDate: new Date().toISOString(),
      amount: 0,
    },
    comment: '',
  }

  static ORDER_KEYS = [
    'date',
    'duration',
    'service',
    'paymentType',
    'fees',
    'price',
    'address',
    'extraAddresses',
    'destination',
    'name',
    'email',
    'phone',
    'boxes',
    'comment',
  ]

  constructor(order) {
    for (const propertyName of [...Order.ORDER_KEYS, ...Object.keys(Order.EMPTY_ORDER)]) {
      this[propertyName] = order[propertyName] ?? Order.EMPTY_ORDER[propertyName]
    }
    this.date = new Date(order.date)
  }

  get time() {
    return this.date.toTimeString().slice(0, 5)
  }

  get servicePrice() {
    return this.service.pricePerHour * this.duration
  }

  // set service(service) {
  //   this.servicePrice = service.pricePerHour * this.duration
  // }

  get autoBoxesPrice() {
    const duration = dayjs(this.boxes.returnDate).diff(
      dayjs(this.boxes.deliveryDate),
      boxesSettings.timeUnit
    )

    return (
      this.boxes.amount * boxesSettings.price * duration +
      (boxesSettings.deliveryFee || 0) +
      (boxesSettings.pickupFee || 0)
    )
  }

  get boxesPrice() {
    return this.manualBoxesPrice ?? this.autoBoxesPrice
  }

  set price(p) {
    this.initialPrice = p
  }

  get autoPrice() {
    return (
      this.servicePrice + this.boxes.price + this.fees.reduce((acc, cur) => acc + cur.amount, 0)
    )
  }

  get price() {
    return this.manualPrice ?? this.autoPrice
  }

  get ISODateString() {
    return `${this.date.toISOString().split('T')[0]}T${this.time}`
  }

  get confirmationDateString() {
    let dd = this.date.getDate()
    let mm = this.date.getMonth() + 1
    const yyyy = this.date.getFullYear()

    if (dd < 10) {
      dd = `0${dd}`
    }
    if (mm < 10) {
      mm = `0${mm}`
    }

    return `${dd}-${mm}-${yyyy}`
  }

  get autoFees() {
    const hour = this.time.split(':')[0] * 1

    const dayOFWeek = this.date.getDay()
    const dayOfMonth = this.date.getDate()
    const endOfMonth = [new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).getDate(), 1]

    const weekEndFeeApplicable = dayOFWeek === 6 || dayOFWeek === 0

    return fees.filter((f) => {
      switch (f.name) {
        case 'holidayFee': {
          // Currently not implemented
          return false
        }
        case 'weekendFee': {
          return weekEndFeeApplicable
        }
        case 'startOrEndOfMonthFee': {
          return !weekEndFeeApplicable && endOfMonth.includes(dayOfMonth)
        }
        case 'nightFee': {
          return hour < 8 || hour >= 20
        }
        case 'paymentTypeFee': {
          return this.paymentType.fee > 0
        }
        default: {
          return false
        }
      }
    })
  }

  set fees(f) {
    this.initialFees = f
  }

  get fees() {
    const allFees = [...this.initialFees, ...this.autoFees]

    // Filter out fees that are marked for removal in manualFees
    // and concat the rest
    const uniqueFees = allFees
      .filter((f) => !this.manualFees.find((mf) => mf.remove && mf.id === f.id))
      .concat(this.manualFees.filter((mf) => !mf.remove))

    return uniqueFees
  }

  get eventColor() {
    if (this.color) {
      return this.color
    }

    if (this.service.id) {
      return services[this.service.id].eventColor
    }

    return null
  }

  set eventColor(color) {
    this.color = color
  }

  get serviceName() {
    return this.service.name
  }

  set serviceName(serviceName) {
    this.service = services.find((s) => s.name === serviceName)
    this.eventColor = services.find((s) => s.name === serviceName)?.eventColor
    this.hsy = Boolean(this.service.hsy)
  }

  /**
   * Deletes properties hsy, altColorPalette and distance.
   * Transforms to JSON
   */
  prepareForSending() {
    const prepared = {}

    for (const key of [...Order.ORDER_KEYS, ...Object.keys(Order.EMPTY_ORDER)]) {
      if (key !== 'service') {
        prepared[key] = this[key]
      }
    }

    return prepared
  }

  static getEventForCalendar(formattedStr, startMarker) {
    return formattedStr.slice(formattedStr.indexOf(startMarker))
  }

  static setupOrderFromText(text) {
    return new Promise((resolve) => {
      let tmpOrder
      const orderArguments = {}

      if (isJSON(text)) {
        tmpOrder = new Order(JSON.parse(text))
      } else {
        tmpOrder = new TextOrder(text)
      }

      for (const propertyName of Order.ORDER_KEYS) {
        try {
          orderArguments[propertyName] = tmpOrder[propertyName]
        } catch (err) {
          enqueueSnackbar(err.message, { variant: 'error' })

          orderArguments[propertyName] = null
        }
      }

      return resolve(new Order(orderArguments))
    })
  }

  static default() {
    return new Order(Order.EMPTY_ORDER)
  }

  /**
   * Formats an address object into a string with an optional label.
   * @param {{street: string, index: string, city: string}} address - The address details.
   * @returns {string} Formatted address string ending with newline.
   */
  static getAddressString(address) {
    let result = ''
    result += address.street
    if (address.index || address.city) {
      result += `, ${address.index} ${address.city}`
    }
    result += '\n'
    return result
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
        transformed += `${this.paymentType.name}\n`
      }
      if (options.fees) {
        this.fees.forEach((f) => {
          transformed += `${f.label?.toUpperCase()}\n`
          transformed += `${f.amount}€\n`
        })
      }
      if (options.address) {
        transformed += 'LÄHTÖPAIKKA\n'
        transformed += Order.getAddressString(this.address)
      }
      if (options.extraAddresses && this.extraAddresses.length > 0) {
        transformed += 'LISÄPYSÄHDYKSET\n'
        this.extraAddresses.forEach((a) => {
          transformed += Order.getAddressString(a)
        })
      }
      if (options.destination && this.destination.street.length > 5) {
        transformed += 'MÄÄRÄNPÄÄ\n'
        transformed += Order.getAddressString(this.destination)
      }
      if (options.name) {
        transformed += 'NIMI\n'
        transformed += `${this.name || '?'}\n`
      }
      if (options.email) {
        transformed += 'SÄHKÖPOSTI\n'
        transformed += `${this.email || '?'}\n`
      }
      if (options.phone) {
        transformed += 'PUHELIN\n'
        transformed += `${this.phone || '?'}\n`
      }

      if (options.boxes && this.boxes.amount > 0) {
        const boxDelDateStr = dayjs(this.boxes.deliveryDate).format(
          `DD-MM-YYYY ${this.boxes.deliveryDate.includes('T') ? 'HH:mm' : ''}`
        )
        const boxPickDateStr = dayjs(this.boxes.returnDate).format(
          `DD-MM-YYYY ${this.boxes.returnDate.includes('T') ? 'HH:mm' : ''}`
        )

        transformed += 'MUUTTOLAATIKOT\n'
        transformed += `${boxDelDateStr} - ${boxPickDateStr}\n`
        if (this.selfPickup) transformed += 'Itse nouto\n'
        if (this.selfReturn) transformed += 'Itse palautus\n'
        transformed += `Määrä: ${this.boxes.amount} kpl\n`
        transformed += `Hinta: ${this.boxesPrice}€\n`
      }

      if (options.comment) {
        transformed += 'LISÄTIETOJA\n'

        if (this.address.floor || this.address.elevator) {
          transformed += `Lähtö: ${this.address.floor} krs.${
            this.address.elevator ? ', hissi on.' : ', ei hissiä.'
          }\n`
        }

        if (this.destination.floor || this.destination.elevator) {
          transformed += `Määränpää: ${this.destination.floor} krs.${
            this.destination.elevator ? ', hissi on.' : ', ei hissiä.'
          }\n`
        }

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
