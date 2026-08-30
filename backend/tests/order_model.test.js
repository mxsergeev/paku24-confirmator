import { describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import Order from '../models/order.js'

const address = {
  street: 'Mannerheimintie 10',
  index: '00100',
  city: 'Helsinki',
  floor: 2,
  elevator: false,
}

const service = {
  id: 'external-service',
  name: 'External service',
  pricePerHour: 61,
  price: 122,
  eventColor: '7',
  multiplier: 1,
}

const paymentType = {
  id: 'external-payment',
  name: 'External payment',
  fee: 3,
  additionalFieldLabel: 'Reference',
  additionalFieldValue: 'WP-123',
  details: { source: 'wordpress' },
}

const fee = {
  name: 'stairsFee',
  label: 'KERROSLISÄ',
  amount: 10,
  comment: 'Second floor',
  baseFee: 10,
  startFloor: 2,
}

const makeSnapshot = (overrides = {}) => ({
  distance: 'insideCapital',
  hsy: false,
  XL: false,
  eventColor: '7',
  date: '2026-01-15T07:00:00.000Z',
  duration: 2,
  service,
  paymentType,
  fees: [fee],
  boxes: {
    deliveryDate: '2026-03-12',
    returnDate: new Date('2026-03-20T07:00:00.000Z'),
    amount: 10,
    pricePerBox: 2,
    deliveryPrice: 10,
    returnPrice: 10,
  },
  boxesPrice: 52,
  price: 167,
  address,
  extraAddresses: [],
  destination: address,
  name: 'WordPress Customer',
  email: 'customer@example.com',
  phone: '+358401234567',
  comment: 'Call on arrival.',
  ...overrides,
})

const makeOrder = (overrides = {}) => ({
  distance: 'insideCapital',
  hsy: false,
  XL: false,
  eventColor: '7',
  date: '2026-01-15T07:00:00.000Z',
  duration: 2,
  service,
  paymentType,
  address,
  extraAddresses: [],
  destination: address,
  boxes: {
    deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
    returnDate: '2026-03-20',
    amount: 10,
  },
  name: 'WordPress Customer',
  email: 'customer@example.com',
  phone: '+358401234567',
  comment: 'Call on arrival.',
  origin: 'wordpress',
  initialSnapshot: makeSnapshot(),
  pricing: {
    source: {
      price: 'initial',
      fees: 'initial',
      boxesPrice: 'initial',
    },
    manual: {
      price: null,
      fees: null,
      boxesPrice: null,
    },
  },
  price: 167,
  fees: [fee],
  boxesPrice: 52,
  ...overrides,
})

describe('Order Mongoose schema', () => {
  it('persists canonical WordPress and app state without broad Mixed paths', () => {
    const wordpress = new Order(makeOrder())
    const app = new Order({
      ...makeOrder(),
      origin: 'app',
      initialSnapshot: null,
      pricing: {
        source: { price: 'auto', fees: 'auto', boxesPrice: 'auto' },
        manual: { price: 0, fees: [], boxesPrice: 0 },
      },
      price: 0,
      fees: [],
      boxesPrice: 0,
    })

    expect(wordpress.validateSync()).toBeUndefined()
    expect(app.validateSync()).toBeUndefined()
    expect(wordpress.distance).toBe('insideCapital')
    expect(wordpress.hsy).toBe(false)
    expect(wordpress.XL).toBe(false)
    expect(wordpress.origin).toBe('wordpress')
    expect(wordpress.initialSnapshot).toBeTruthy()
    expect(wordpress.paymentType.details).toEqual({ source: 'wordpress' })
    expect(app.initialSnapshot).toBeNull()
    expect(app.pricing.manual.price).toBe(0)
    expect(app.pricing.manual.fees).toHaveLength(0)
    expect(app.pricing.manual.boxesPrice).toBe(0)
    expect(Order.schema.path('pricing').instance).not.toBe('Mixed')
    expect(Order.schema.path('initialSnapshot').instance).not.toBe('Mixed')
  })

  it('keeps date-only boxes as strings while casting datetime boxes to Date', () => {
    const order = new Order(makeOrder())

    expect(order.boxes.deliveryDate).toBeInstanceOf(Date)
    expect(order.boxes.returnDate).toBe('2026-03-20')
    expect(order.initialSnapshot.boxes.deliveryDate).toBe('2026-03-12')
    expect(order.initialSnapshot.boxes.returnDate).toBeInstanceOf(Date)
    expect(order.validateSync()).toBeUndefined()
  })

  it.each([
    ['origin', { origin: 'email' }, /origin/],
    [
      'pricing source',
      { pricing: { source: { price: 'imported' } } },
      /pricing\.source\.price/,
    ],
    [
      'date-only delivery date',
      { boxes: { deliveryDate: '2026-02-29', returnDate: '2026-03-20', amount: 1 } },
      /boxes\.deliveryDate/,
    ],
    [
      'timezone-less box datetime',
      {
        boxes: {
          deliveryDate: '2026-03-12T09:00:00',
          returnDate: '2026-03-20',
          amount: 1,
        },
      },
      /boxes\.deliveryDate/,
    ],
  ])('rejects invalid %s', (_name, overrides, errorPattern) => {
    const error = new Order(makeOrder(overrides)).validateSync()

    expect(error).toBeTruthy()
    expect(error.message).toMatch(errorPattern)
  })

  it('marks origin and initialSnapshot immutable and keeps the JSON id transform', () => {
    expect(Order.schema.path('origin').options.immutable).toBe(true)
    expect(Order.schema.path('initialSnapshot').options.immutable).toBe(true)

    const json = new Order(makeOrder()).toJSON()
    expect(json.id).toBe(json.id.toString())
    expect(mongoose.isValidObjectId(json.id)).toBe(true)
    expect(json).not.toHaveProperty('_id')
    expect(json).not.toHaveProperty('__v')
  })
})
