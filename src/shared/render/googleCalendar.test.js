import { describe, expect, it } from 'vitest'
import paymentTypes from '../../data/paymentTypes.json' with { type: 'json' }
import services from '../../data/services.json' with { type: 'json' }
import { makeCalendarEntries, makeIcons } from './googleCalendar.js'

const makeOrder = (overrides = {}) => ({
  date: new Date('2026-03-10T07:00:00.000Z'),
  duration: 2,
  service: services[0],
  paymentType: paymentTypes[0],
  distance: 'insideCapital',
  fees: [],
  address: {
    street: 'Testikatu 1 A 2',
    index: '',
    city: 'Helsinki',
    floor: 0,
    elevator: false,
  },
  extraAddresses: [],
  destination: {
    street: 'Testikatu 2 B 3',
    index: '',
    city: 'Helsinki',
    floor: 0,
    elevator: false,
  },
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '+00000000000',
  comment: 'Fixture comment',
  boxes: {
    deliveryDate: '2026-03-12T07:00:00Z',
    deliveryHasTime: true,
    returnDate: '2026-03-20T07:00:00Z',
    returnHasTime: true,
    amount: 10,
  },
  pricingOverrides: {
    price: 320,
    fees: [],
    boxesPrice: 200,
  },
  ...overrides,
})

describe('makeIcons', () => {
  it('combines distance, fee, service, and payment icons in order', () => {
    expect(
      makeIcons(
        makeOrder({
          distance: 'outsideCapital',
          pricingOverrides: {
            price: 320,
            fees: [{ name: 'nightFee', amount: 20 }],
            boxesPrice: 200,
          },
        }),
      ),
    ).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🚧🌚🚚💳' })
  })
})

describe('makeCalendarEntries', () => {
  it('creates move, delivery, and return entries with formatted descriptions', () => {
    const order = makeOrder()
    const entries = makeCalendarEntries(order)

    expect(Object.keys(entries)).toEqual(['move', 'deliveryDate', 'returnDate'])
    expect(entries.move.title).toBe('🚚💳09:00(2h) Test Customer')
    expect(entries.move.description).toContain('Määrä: 10 kpl')
    expect(entries.move.description).toContain('Testikatu 1 A 2')
    expect(entries.move.description).not.toContain('MUUTTOLAATIKOT')
    expect(entries.deliveryDate.description).toContain('12-03-2026 09:00 - 20-03-2026 09:00')
    expect(entries.deliveryDate.description).not.toContain('MUUTTOLAATIKOT')
    expect(entries.returnDate.title).toContain('NOUTO')
    expect(entries.returnDate.description).toContain('Testikatu 2 B 3')
  })

  it('accepts Date box values and date-only box values', () => {
    const dateValues = makeCalendarEntries(
      makeOrder({
        boxes: {
          deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
          deliveryHasTime: true,
          returnDate: new Date('2026-03-20T07:00:00.000Z'),
          returnHasTime: true,
          amount: 10,
        },
      }),
    )
    const dateOnlyValues = makeCalendarEntries(
      makeOrder({
        boxes: {
          deliveryDate: new Date('2026-03-12T00:00:00.000Z'),
          deliveryHasTime: false,
          returnDate: new Date('2026-03-20T00:00:00.000Z'),
          returnHasTime: false,
          amount: 10,
        },
      }),
    )

    expect(dateValues.deliveryDate.title).toContain('09:00')
    expect(dateOnlyValues.deliveryDate.title).toBe('10 📦 Test Customer')
    expect(dateOnlyValues.returnDate.title).toBe('NOUTO 10 📦 Test Customer')
  })

  it('renders safely when boxes are missing', () => {
    const entries = makeCalendarEntries(makeOrder({ boxes: undefined }))

    expect(entries.deliveryDate.title).toBe('0 📦 Test Customer')
    expect(entries.returnDate.title).toBe('NOUTO 0 📦 Test Customer')
    expect(entries.move.description).not.toContain('MUUTTOLAATIKOT')
  })

  it('renders safely when charged boxes have incomplete dates', () => {
    const entries = makeCalendarEntries(
      makeOrder({ boxes: { deliveryDate: null, returnDate: null, amount: 10 } }),
    )

    expect(entries.move.description).not.toContain('Määrä: 10 kpl')
  })

  it('uses Helsinki time for absolute instants regardless of the host timezone', () => {
    const entries = makeCalendarEntries(
      makeOrder({
        date: '2026-03-10T07:00:00Z',
        boxes: {
          deliveryDate: '2026-03-12T07:00:00Z',
          deliveryHasTime: true,
          returnDate: '2026-03-20T07:00:00Z',
          returnHasTime: true,
          amount: 10,
        },
      }),
    )

    expect(entries.move.title).toContain('09:00')
    expect(entries.deliveryDate.title).toContain('09:00')
    expect(entries.returnDate.title).toContain('09:00')
  })

  it('rejects invalid provided datetime values with a clear error', () => {
    expect(() =>
      makeCalendarEntries(
        makeOrder({
          boxes: {
            deliveryDate: {},
            deliveryHasTime: true,
            returnDate: '2026-03-20T07:00:00Z',
            returnHasTime: true,
            amount: 10,
          },
        }),
      ),
    ).toThrow('Invalid boxes.deliveryDate')
  })
})
