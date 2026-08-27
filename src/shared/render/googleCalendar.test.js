import { describe, expect, it } from 'vitest'
import paymentTypes from '../../data/paymentTypes.json' with { type: 'json' }
import services from '../../data/services.json' with { type: 'json' }
import dayjs from '../dayjs.js'
import { makeCalendarEntries, makeIcons } from './googleCalendar.js'

const makeOrder = (overrides = {}) => ({
  date: new Date('2026-03-10T07:00:00.000Z'),
  duration: 2,
  service: services[0],
  paymentType: paymentTypes[0],
  distance: 'insideCapital',
  XL: false,
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
    returnDate: '2026-03-20T07:00:00Z',
    amount: 10,
  },
  boxesPrice: 200,
  price: 320,
  ...overrides,
})

describe('makeIcons', () => {
  it('combines size, distance, fee, service, and payment icons in order', () => {
    expect(
      makeIcons(
        makeOrder({
          XL: true,
          distance: 'outsideCapital',
          fees: [{ name: 'nightFee' }],
        }),
      ),
    ).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: 'XL🚧🌚🚚💳' })
  })
})

describe('makeCalendarEntries', () => {
  it('creates move, delivery, and return entries with formatted descriptions', () => {
    const order = makeOrder()
    const entries = makeCalendarEntries(order)

    expect(Object.keys(entries)).toEqual(['move', 'deliveryDate', 'returnDate'])
    expect(entries.move.title).toBe(`🚚💳${dayjs(order.date).format('HH:mm')}(2h) Test Customer`)
    expect(entries.move.description).toContain('Määrä: 10 kpl')
    expect(entries.move.description).toContain('Testikatu 1 A 2')
    expect(entries.deliveryDate.description).toContain('12-03-2026 09:00 - 20-03-2026 09:00')
    expect(entries.returnDate.title).toContain('NOUTO')
    expect(entries.returnDate.description).toContain('Testikatu 2 B 3')
  })

  it('accepts Date box values and date-only box values', () => {
    const dateValues = makeCalendarEntries(
      makeOrder({
        boxes: {
          deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
          returnDate: new Date('2026-03-20T07:00:00.000Z'),
          amount: 10,
        },
      }),
    )
    const dateOnlyValues = makeCalendarEntries(
      makeOrder({
        boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: 10 },
      }),
    )

    expect(dateValues.deliveryDate.title).toContain(
      dayjs(new Date('2026-03-12T07:00:00.000Z')).format('HH:mm'),
    )
    expect(dateOnlyValues.deliveryDate.title).toBe('10 📦 Test Customer')
    expect(dateOnlyValues.returnDate.title).toBe('NOUTO 10 📦 Test Customer')
  })

  it('renders safely when boxes are missing', () => {
    const entries = makeCalendarEntries(makeOrder({ boxes: undefined }))

    expect(entries.deliveryDate.title).toBe('0 📦 Test Customer')
    expect(entries.returnDate.title).toBe('NOUTO 0 📦 Test Customer')
    expect(entries.move.description).not.toContain('MUUTTOLAATIKOT')
  })
})
