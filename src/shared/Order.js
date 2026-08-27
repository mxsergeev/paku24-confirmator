/* eslint-disable no-console */
import { enqueueSnackbar } from 'notistack'
import isJSON from 'validator/lib/isJSON.js'
import services from '../data/services.json' with { type: 'json' }
import TextOrder from './TextOrder.js'
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import distances from '../data/distances.json' with { type: 'json' }
import boxesSettings from '../data/boxes.json' with { type: 'json' }
import dayjs from './dayjs.js'
import { fromZonedTime } from './date-fns-tz.js'
import { calculateAutomaticFees, getAvailableFees } from './fees.js'
import { formatAddress, formatAddressLocation, formatOrder } from './render/text.js'
import { makeCalendarEntries, makeIcons } from './render/googleCalendar.js'

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
    canceledAt: null,
  }

  constructor(order = Order.EMPTY_ORDER) {
    for (const key of Object.keys(Order.EMPTY_ORDER)) {
      this[key] = order[key] ?? Order.EMPTY_ORDER[key]
    }

    // Preserve identifiers and backend metadata that are not part of EMPTY_ORDER.
    this.id = order.id ?? order._id ?? null
    this._id = order._id ?? null
    this.confirmed = Boolean(order.confirmed)
    this.confirmedBy = order.confirmedBy ?? null
    this.receivedAt = order.receivedAt ?? null
    this.deletedAt = order.deletedAt ?? null
    this.markedForDeletion = Boolean(order.markedForDeletion)
    this.invoiceNumber = order.invoiceNumber ?? null

    if (order.confirmedAt) {
      this.confirmedAt = order.confirmedAt
    }

    if (order.canceledAt) {
      this.canceledAt = order.canceledAt
    }

    this.date = new Date(order.date || Order.EMPTY_ORDER.date)
  }

  get servicePrice() {
    return Number(this.service.pricePerHour) * Number(this.duration)
  }

  get autoBoxesPrice() {
    let duration = dayjs(this.boxes.returnDate).diff(
      dayjs(this.boxes.deliveryDate),
      boxesSettings.timeUnit,
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
    return calculateAutomaticFees(this)
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

  get time() {
    return dayjs(this.date).format('HH:mm')
  }

  /**
   * Transform into a plain object suitable for sending to backend or external APIs.
   */
  prepareForSending() {
    const prepared = {}

    for (const key of Object.keys(Order.EMPTY_ORDER)) {
      if (key === 'date') {
        prepared.date = fromZonedTime(this.date).toISOString()
      } else if (key === 'boxes') {
        prepared.boxes = {
          ...this.boxes,
          deliveryDate: fromZonedTime(new Date(this.boxes.deliveryDate)).toISOString(),
          returnDate: fromZonedTime(new Date(this.boxes.returnDate)).toISOString(),
        }
      } else {
        prepared[key] = this[key]
      }
    }

    // Add computed time field for backend use
    prepared.time = this.time

    if (this.canceledAt) {
      prepared.canceledAt = this.canceledAt
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
    return formatAddress(address)
  }

  /**
   * Address string suitable for calendar `location` field — excludes floor/elevator info.
   */
  static addrStrLocation(address) {
    return formatAddressLocation(address)
  }

  static makeIcons(order) {
    return makeIcons(order)
  }

  static makeCalendarEntries(order) {
    return makeCalendarEntries(order)
  }

  static format(order, opts = {}, { removeFirstHeading = false } = {}) {
    return formatOrder(order, opts, { removeFirstHeading })
  }

  static getAvailableFees(order) {
    return getAvailableFees(order)
  }
}

export default Order
