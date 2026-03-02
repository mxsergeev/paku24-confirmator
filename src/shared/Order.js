/* eslint-disable no-console */
import { enqueueSnackbar } from 'notistack'
import isJSON from 'validator/lib/isJSON.js'
import fees from '../data/fees.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import TextOrder from './TextOrder.js'
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import distances from '../data/distances.json' with { type: 'json' }
import boxesSettings from '../data/boxes.json' with { type: 'json' }
import icons from '../data/icons.json' with { type: 'json' }
import dayjs from './dayjs.js'
import { isNode } from './isNode.js'
import { toZonedTime, fromZonedTime } from './date-fns-tz.js'

const getDateInTz = (d) => (isNode() ? toZonedTime(d) : d)

class Order {
  static EMPTY_ORDER = {
    distance: distances.insideCapital,
    hsy: false,
    XL: false,
    eventColor: null,
    manualFees: null,
    manualBoxesPrice: null,
    initialFees: null,
    initialBoxesPrice: null,
    initialPrice: null,
    manualPrice: null,

    date: new Date(),
    duration: 1,
    service: {
      id: '1',
      name: services[0].name,
      pricePerHour: Number(services[0].pricePerHour),
    },
    paymentType: {
      id: '1',
      name: paymentTypes[0].name,
      fee: Number(paymentTypes[0].fee) || 0,
    },
    fees: [],
    boxes: {
      deliveryDate: new Date().toISOString(),
      returnDate: new Date().toISOString(),
      amount: 0,
    },
    boxesPrice: null,
    price: null,
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
    comment: '',
  }

  constructor(order = Order.EMPTY_ORDER) {
    for (const key of Object.keys(Order.EMPTY_ORDER)) {
      this[key] = order[key] ?? Order.EMPTY_ORDER[key]
    }

    this.date = new Date(order.date || Order.EMPTY_ORDER.date)
  }

  get servicePrice() {
    return Number(this.service.pricePerHour) * Number(this.duration)
  }

  get autoBoxesPrice() {
    let duration = dayjs(this.boxes.returnDate).diff(
      dayjs(this.boxes.deliveryDate),
      boxesSettings.timeUnit
    )

    if (duration < boxesSettings.minPeriod) {
      duration = boxesSettings.minPeriod
    }

    if (isNaN(this.boxes.amount) || this.boxes.amount === 0) {
      return 0
    }

    return (
      this.boxes.amount * boxesSettings.price * duration +
      (boxesSettings.deliveryFee || 0) +
      (boxesSettings.pickupFee || 0)
    )
  }

  get boxesPrice() {
    return this.manualBoxesPrice ?? this.autoBoxesPrice ?? this.initialBoxesPrice
  }

  set boxesPrice(p) {
    this.initialBoxesPrice = p
  }

  get autoPrice() {
    return this.servicePrice + this.boxesPrice + this.fees.reduce((acc, cur) => acc + cur.amount, 0)
  }

  get price() {
    return this.manualPrice ?? this.autoPrice ?? this.initialPrice
  }

  set price(p) {
    this.initialPrice = p
  }

  get autoFees() {
    const hour = this.date.getHours()

    const dayOFWeek = this.date.getDay()
    const dayOfMonth = this.date.getDate()
    const endOfMonth = [new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).getDate(), 1]

    const weekEndFeeApplicable = dayOFWeek === 6 || dayOFWeek === 0

    return Order.getAvailableFees(this).filter((f) => {
      if (f.name === 'holidayFee') {
        // Currently not implemented
        return false
      }

      if (f.name === 'weekendFee') {
        return weekEndFeeApplicable
      }

      if (f.name === 'startOrEndOfMonthFee') {
        return !weekEndFeeApplicable && endOfMonth.includes(dayOfMonth)
      }

      if (f.name === 'nightFee') {
        return hour < 8 || hour >= 20
      }

      if (f.name === 'paymentTypeFee') {
        return this.paymentType.fee > 0
      }

      if (f.name.startsWith('stairsFee')) {
        return true
      }

      return false
    })
  }

  set fees(f) {
    this.initialFees = f
  }

  get fees() {
    return this.manualFees ?? this.autoFees ?? this.initialFees
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
   * Transform into a plain object suitable for sending to backend or external APIs.
   */
  prepareForSending() {
    const prepared = {}

    for (const key of Object.keys(Order.EMPTY_ORDER)) {
      if (key === 'date') {
        prepared.date = fromZonedTime(this.date).toISOString()
      }
      if (key === 'boxes') {
        prepared.boxes = {
          ...this.boxes,
          deliveryDate: fromZonedTime(new Date(this.boxes.deliveryDate)).toISOString(),
          returnDate: fromZonedTime(new Date(this.boxes.returnDate)).toISOString(),
        }
      } else {
        prepared[key] = this[key]
      }
    }

    return prepared
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

      for (const propertyName of Object.keys(Order.EMPTY_ORDER)) {
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
   * Formats an address object into a string.
   * @param {{street: string, index: string, city: string}} address - The address details.
   * @returns {string} Formatted address string ending with newline.
   */
  static addrStr(address) {
    let result = ''
    result += address.street
    if (address.index || address.city) {
      result += `, ${address.index} ${address.city}`
    }
    result += '\n'
    return result
  }

  static makeIcons(order) {
    const sizeIcon = order.XL ? icons.size.XL : ''
    const distanceIcon = icons.misc[order.distance] || ''
    const feeIcons = order.fees
      .map((fee) => icons.fees[fee.name])
      .filter((icon) => icon)
      .reduce((acc, cur) => acc + cur, '')
    const serviceIcons = icons.service[order.service.id]
    const paymentIcons = icons.payment[order.paymentType.id]

    return {
      move: `${sizeIcon}${distanceIcon}${feeIcons}${serviceIcons}${paymentIcons}`,
      boxesDelivery: icons.boxes.delivery,
      boxesPickup: icons.boxes.pickup,
    }
  }

  static makeCalendarEntries(order) {
    const moveTitle = `${Order.makeIcons(order).move}${dayjs(order.date).format('HH:mm')}(${
      order.duration
    }h)`

    const boxes = order.boxes || { amount: 0, deliveryDate: '', returnDate: '' }

    const boxesDeliveryTitle = `${boxes.amount} ${Order.makeIcons(order).boxesDelivery} ${
      boxes.deliveryDate && boxes.deliveryDate.includes('T')
        ? `${dayjs(boxes.deliveryDate).format('HH:mm')} `
        : ''
    }`

    const boxesPickupTitle = `NOUTO ${boxes.amount} ${Order.makeIcons(order).boxesPickup} ${
      boxes.returnDate && boxes.returnDate.includes('T')
        ? `${dayjs(boxes.returnDate).format('HH:mm')} `
        : ''
    }`

    return {
      move: {
        title: `${moveTitle} ${order.name}`,
        description: `${moveTitle}${Order.format(
          order,
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
      deliveryDate: {
        title: `${boxesDeliveryTitle}${order.name}`,
        description: `${boxesDeliveryTitle}${Order.format(
          order,
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
      returnDate: {
        title: `${boxesPickupTitle}${order.name}`,
        description: `${boxesPickupTitle}${Order.format(
          order,
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

  static format(order, opts = {}, { removeFirstHeading = false } = {}) {
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
      transformed += `${order.duration}h (${order.servicePrice}€/h, ${order.serviceName})\n`
    }
    if (options.paymentType) {
      transformed += 'MAKSUTAPA\n'
      transformed += `${order.paymentType.name}\n`
    }
    if (options.fees) {
      order.fees.forEach((f) => {
        const label = f.label ?? fees.find((fee) => fee.name === f.name)?.label ?? ''

        transformed += `${label.toUpperCase()}\n`
        transformed += `${f.amount}€\n`
      })
    }
    if (options.boxes && order.boxes && order.boxes.amount > 0) {
      const boxDelDateStr = dayjs(getDateInTz(order.boxes.deliveryDate)).format(
        `DD-MM-YYYY ${order.boxes.deliveryDate.includes('T') ? 'HH:mm' : ''}`
      )
      const boxPickDateStr = dayjs(getDateInTz(order.boxes.returnDate)).format(
        `DD-MM-YYYY ${order.boxes.returnDate.includes('T') ? 'HH:mm' : ''}`
      )

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
      transformed += Order.addrStr(order.address)
    }
    if (options.extraAddresses && order.extraAddresses && order.extraAddresses.length > 0) {
      transformed += 'LISÄPYSÄHDYKSET\n'
      order.extraAddresses.forEach((a) => {
        transformed += Order.addrStr(a)
      })
    }
    if (
      options.destination &&
      order.destination &&
      order.destination.street &&
      order.destination.street.length > 5
    ) {
      transformed += 'MÄÄRÄNPÄÄ\n'
      transformed += Order.addrStr(order.destination)
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

      if (order.address.floor || order.address.elevator) {
        transformed += `Lähtö: ${order.address.floor} krs.${
          order.address.elevator ? ', hissi on.' : ', ei hissiä.'
        }\n`
      }

      if (order.destination.floor || order.destination.elevator) {
        transformed += `Määränpää: ${order.destination.floor} krs.${
          order.destination.elevator ? ', hissi on.' : ', ei hissiä.'
        }\n`
      }

      transformed += `${order.comment}\n`
    }

    if (removeFirstHeading) {
      const ar = transformed.split('\n')
      ar.shift()

      transformed = ar.join('\n')
    }

    return transformed
  }

  static getAvailableFees(order) {
    // Floor fee calculation
    const stairsFeeConfig = fees.find((f) => f.name === 'stairsFee')
    if (!order || !order.service) return fees.filter((f) => f.name !== 'stairsFee')
    const serviceObj = services.find((s) => String(s.id) === String(order.service.id))

    const baseFee = Number(stairsFeeConfig?.baseFee)
    const startFloor = Number(stairsFeeConfig?.startFloor)
    const multiplier = Number(serviceObj?.multiplier)
    const floorFees = []

    if (!isNaN(baseFee) && !isNaN(startFloor) && !isNaN(multiplier) && multiplier > 0) {
      const addresses = [order.address, order.destination, ...(order.extraAddresses || [])]

      addresses.forEach((address, index) => {
        if (address.elevator || address.floor < startFloor) {
          return
        }

        const floorsAbove = Number(address.floor) - startFloor
        floorFees.push({
          name: `stairsFee_${index}`,
          label: `KERROSLISÄ ${address.street ? `(${address.street})` : ''}`,
          amount: floorsAbove * baseFee * multiplier,
        })
      })
    }

    const availableFees = fees.filter((f) => f.name !== 'stairsFee').concat(floorFees)

    return availableFees
  }
}

export default Order
