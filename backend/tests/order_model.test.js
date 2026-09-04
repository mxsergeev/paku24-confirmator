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

const makeOrder = (overrides = {}) => ({
  distance: 'insideCapital',
  hsy: false,
  eventColor: '7',
  date: '2026-01-15T07:00:00.000Z',
  duration: 2,
  service: {
    id: 'external-service',
    name: 'External service',
    pricePerHour: 61,
    details: { source: 'wordpress' },
  },
  paymentType: {
    id: 'external-payment',
    name: 'External payment',
    fee: 3,
    details: { source: 'wordpress' },
  },
  address,
  extraAddresses: [],
  destination: address,
  boxes: {
    deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
    deliveryHasTime: true,
    returnDate: new Date('2026-03-20T00:00:00.000Z'),
    returnHasTime: false,
    amount: 10,
  },
  name: 'WordPress Customer',
  email: 'customer@example.com',
  phone: '+358401234567',
  comment: 'Call on arrival.',
  originalOrder: { source: 'wordpress', price: 167 },
  pricingOverrides: { price: null, fees: null, boxesPrice: null },
  ...overrides,
})

describe('Order Mongoose schema', () => {
  it('persists booking data, manual overrides, and immutable reference data', () => {
    const wordpress = new Order(makeOrder())
    const app = new Order({
      ...makeOrder(),
      originalOrder: null,
      pricingOverrides: { price: 0, fees: [], boxesPrice: 0 },
    })

    expect(wordpress.validateSync()).toBeUndefined()
    expect(app.validateSync()).toBeUndefined()
    expect(wordpress.service.details).toEqual({ source: 'wordpress' })
    expect(wordpress.paymentType.details).toEqual({ source: 'wordpress' })
    expect(wordpress.originalOrder).toEqual({ source: 'wordpress', price: 167 })
    expect(app.originalOrder).toBeNull()
    expect(app.pricingOverrides.price).toBe(0)
    expect(app.pricingOverrides.fees).toHaveLength(0)
    expect(app.pricingOverrides.boxesPrice).toBe(0)
    expect(Order.schema.path('pricingOverrides').instance).not.toBe('Mixed')
    expect(Order.schema.path('originalOrder').instance).toBe('Mixed')
  })

  it('persists both box dates as Dates with explicit time modes', () => {
    const order = new Order(makeOrder())

    expect(order.boxes.deliveryDate).toBeInstanceOf(Date)
    expect(order.boxes.deliveryHasTime).toBe(true)
    expect(order.boxes.returnDate).toBeInstanceOf(Date)
    expect(order.boxes.returnHasTime).toBe(false)
    expect(order.validateSync()).toBeUndefined()
  })

  it('does not persist legacy box pricing fields', () => {
    const order = new Order(new Order(makeOrder()).toObject())
    order.boxes.pricePerBox = 1
    order.boxes.deliveryPrice = 2
    order.boxes.returnPrice = 3

    expect(order.toObject().boxes).not.toHaveProperty('pricePerBox')
    expect(order.toObject().boxes).not.toHaveProperty('deliveryPrice')
    expect(order.toObject().boxes).not.toHaveProperty('returnPrice')
    expect(order.validateSync()).toBeUndefined()
  })

  it('does not persist a null deletedAt value for an active order', () => {
    const order = new Order(makeOrder({ deletedAt: null }))

    expect(order.deletedAt).toBeUndefined()
    expect(order.toObject()).not.toHaveProperty('deletedAt')
  })

  it.each([
    ['manual price', { pricingOverrides: { price: 'not-a-number', fees: null, boxesPrice: null } }, /pricingOverrides\.price/],
  ])('rejects invalid %s', (_name, overrides, errorPattern) => {
    const error = new Order(makeOrder(overrides)).validateSync()

    expect(error).toBeTruthy()
    expect(error.message).toMatch(errorPattern)
  })

  it('marks originalOrder immutable and keeps the JSON id transform', () => {
    expect(Order.schema.path('originalOrder').options.immutable).toBe(true)
    expect(Order.schema.path('pricingOverrides').options.immutable).not.toBe(true)

    const json = new Order(makeOrder()).toJSON()
    expect(json.id).toBe(json.id.toString())
    expect(mongoose.isValidObjectId(json.id)).toBe(true)
    expect(json).not.toHaveProperty('_id')
    expect(json).not.toHaveProperty('__v')
  })
})
