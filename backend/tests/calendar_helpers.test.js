import { makeGoogleEventObjects } from '../modules/calendar/calendar.helpers.js'
import { exampleOrder } from './test_helper.js'
import fees from '../../src/data/fees.json' with { type: 'json' }
import paymentTypes from '../../src/data/paymentTypes.json' with { type: 'json' }
import services from '../../src/data/services.json' with { type: 'json' }
import dayjs from '../../src/shared/dayjs.js'
import { makeIcons } from '../../src/shared/render/googleCalendar.js'

describe('makeIcons', () => {
  test('title created right', () => {
    const title = makeIcons({
      ...exampleOrder,
      pricingOverrides: { price: null, fees: [], boxesPrice: null },
    })
    const title2 = makeIcons(
      {
        ...exampleOrder,
        pricingOverrides: { price: null, fees: [], boxesPrice: null },
        service: services.find((s) => s.id === '3'),
        paymentType: paymentTypes.find((p) => p.id === '3'),
        time: new Date('2021-04-22 11:00'),
        duration: 3,
      },
    )
    const title3 = makeIcons(
      {
        ...exampleOrder,
        service: services.find((s) => s.id === '2'),
        paymentType: paymentTypes.find((p) => p.id === '2'),
        time: new Date('2021-04-22 21:00'),
        duration: 1,
        pricingOverrides: { price: null, fees: fees.filter((f) => f.name === 'nightFee'), boxesPrice: null },
      },
    )

    expect(title).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🚚💳' })
    expect(title2).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🚛🚛📜' })
    expect(title3).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🌚🚛🎁' })
  })
})

describe('makeGoogleEventObjects', () => {
  test('resolves automatic and explicit main-event colors', () => {
    const automaticEvents = makeGoogleEventObjects({
      ...exampleOrder,
      eventColor: null,
      service: { ...services[0] },
    })
    const explicitEvents = makeGoogleEventObjects({
      ...exampleOrder,
      eventColor: '11',
      service: { ...services[0] },
    })

    expect(automaticEvents[0].colorId).toBe('1')
    expect(explicitEvents[0].colorId).toBe('11')
  })

  test('marks canceled events without changing the stored color preference', () => {
    const order = {
      ...exampleOrder,
      eventColor: '11',
      canceledAt: new Date('2026-03-10T07:00:00.000Z'),
      boxes: {
        deliveryDate: '2026-03-12',
        returnDate: '2026-03-20',
        amount: 10,
      },
    }

    const events = makeGoogleEventObjects(order)

    expect(events).toHaveLength(3)
    expect(events.every((event) => event.summary.startsWith('(CANCELED) '))).toBe(true)
    expect(events.every((event) => event.colorId === '8')).toBe(true)
    expect(order.eventColor).toBe('11')
    expect(order.canceledAt).toEqual(new Date('2026-03-10T07:00:00.000Z'))
  })

  test('restored events use the normal summary and preference colors', () => {
    const events = makeGoogleEventObjects({
      ...exampleOrder,
      eventColor: '11',
      canceledAt: null,
      boxes: {
        deliveryDate: '2026-03-12',
        returnDate: '2026-03-20',
        amount: 10,
      },
    })

    expect(events[0].summary).not.toContain('(CANCELED)')
    expect(events[0].colorId).toBe('11')
    expect(events.slice(1).every((event) => !event.summary.includes('(CANCELED)'))).toBe(true)
    expect(events.slice(1).every((event) => event.colorId === '1')).toBe(true)
  })

  test('does not create box events until both box dates are available', () => {
    const events = makeGoogleEventObjects({
      ...exampleOrder,
      boxes: { deliveryDate: null, returnDate: null, amount: 10 },
    })

    expect(events.map(({ role }) => role)).toEqual(['main'])
  })

  test('start date time and end date time of event object are correct', () => {
    const eventObject = makeGoogleEventObjects(exampleOrder)[0]

    const d2 = new Date('2021-07-10 23:00')

    const eventObject2 = makeGoogleEventObjects({
      ...exampleOrder,
      date: d2,
      duration: 4,
    })[0]

    expect(eventObject.start.dateTime).toBe(exampleOrder.date.toISOString())
    expect(eventObject.end.dateTime).toBe(
      dayjs(exampleOrder.date).add(exampleOrder.duration, 'hour').toISOString()
    )
    expect(eventObject2.start.dateTime).toBe(d2.toISOString())
    expect(eventObject2.end.dateTime).toBe(dayjs(d2).add(4, 'hour').toISOString())
    expect(eventObject.role).toBe('main')
  })

  test('labels each event role explicitly and formats box locations as strings', () => {
    const events = makeGoogleEventObjects({
      ...exampleOrder,
      address: { street: 'Asematie 1', index: '00100', city: 'Helsinki' },
      destination: { street: 'Satamakatu 2', index: '00160', city: 'Helsinki' },
      boxes: {
        deliveryDate: '2026-03-12T07:00:00.000Z',
        returnDate: '2026-03-20T07:00:00.000Z',
        amount: 10,
      },
    })

    expect(events.map(({ role }) => role)).toEqual(['main', 'boxDelivery', 'boxReturn'])
    expect(events.every((event) => !event.resource)).toBe(true)
    expect(events[0].location).toBe(
      'Asematie 1, 00100 Helsinki\n\nSatamakatu 2, 00160 Helsinki\n'
    )
    expect(typeof events[1].location).toBe('string')
    expect(typeof events[2].location).toBe('string')
    expect(events[1].location).toBe('Asematie 1, 00100 Helsinki\n')
    expect(events[2].location).toBe('Satamakatu 2, 00160 Helsinki\n')
  })

  test('renders Date and date-only box values in calendar descriptions and event times', () => {
    const dateBoxes = {
      ...exampleOrder,
      date: new Date('2026-03-10T07:00:00.000Z'),
      duration: 2,
      boxes: {
        deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
        returnDate: new Date('2026-03-20T07:00:00.000Z'),
        amount: 10,
      },
      pricingOverrides: {
        price: 320,
        fees: [{ name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 }],
        boxesPrice: 200,
      },
      service: { ...exampleOrder.service, name: 'Active service', pricePerHour: 100 },
    }
    const dateEvents = makeGoogleEventObjects(dateBoxes)

    expect(dateEvents[1].start).toEqual({
      dateTime: '2026-03-12T07:00:00.000Z',
      timeZone: 'Europe/Helsinki',
    })
    expect(dateEvents[1].description).toContain('12-03-2026 09:00 - 20-03-2026 09:00')
    expect(dateEvents[1].description).toContain('Hinta: 200€')
    expect(dateEvents[0].description).toContain('YÖ/AAMULISÄ\n20€')
    expect(dateEvents[0].description).toContain('ARVIOITU HINTA\n320€')

    const offsetEvents = makeGoogleEventObjects({
      ...dateBoxes,
      boxes: {
        deliveryDate: '2026-03-12T10:00:00+03:00',
        returnDate: '2026-03-20T10:00:00+03:00',
        amount: 10,
      },
    })

    expect(offsetEvents[1].start).toEqual({
      dateTime: '2026-03-12T07:00:00.000Z',
      timeZone: 'Europe/Helsinki',
    })
    expect(offsetEvents[1].end).toEqual({
      dateTime: '2026-03-12T08:00:00.000Z',
      timeZone: 'Europe/Helsinki',
    })

    const dateOnlyEvents = makeGoogleEventObjects({
      ...dateBoxes,
      boxes: { deliveryDate: '2026-03-12', returnDate: '2026-03-20', amount: 10 },
    })

    expect(dateOnlyEvents[1].start).toEqual({ date: '2026-03-12' })
    expect(dateOnlyEvents[1].end).toEqual({ date: '2026-03-13' })
    expect(dateOnlyEvents[2].start).toEqual({ date: '2026-03-20' })
    expect(dateOnlyEvents[2].end).toEqual({ date: '2026-03-21' })
    expect(dateOnlyEvents[1].description).toContain('12-03-2026 - 20-03-2026')
  })
})
