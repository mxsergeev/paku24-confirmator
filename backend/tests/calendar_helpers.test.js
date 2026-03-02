import { makeGoogleEventObjects } from '../modules/calendar/calendar.helpers.js'
import { exampleOrder, exampleOptions } from './test_helper.js'
import Order from '../../src/shared/Order.js'
import fees from '../../src/data/fees.json' with { type: 'json' }
import paymentTypes from '../../src/data/paymentTypes.json' with { type: 'json' }
import services from '../../src/data/services.json' with { type: 'json' }
import dayjs from '../../src/shared/dayjs.js'

describe('makeIcons', () => {
  test('title created right', () => {
    const title = Order.makeIcons(exampleOrder, exampleOptions)
    const title2 = Order.makeIcons(
      {
        ...exampleOrder,
        service: services.find((s) => s.id === '3'),
        paymentType: paymentTypes.find((p) => p.id === '3'),
        time: new Date('2021-04-22 11:00'),
        duration: 3,
      },
      { ...exampleOptions, XL: true, distance: 'outsideCapital' }
    )
    const title3 = Order.makeIcons(
      {
        ...exampleOrder,
        service: services.find((s) => s.id === '2'),
        paymentType: paymentTypes.find((p) => p.id === '2'),
        time: new Date('2021-04-22 21:00'),
        duration: 1,
        fees: fees.filter((f) => f.name === 'nightFee'),
      },
      { ...exampleOptions, distance: 'fromCapitalToOutside' }
    )

    expect(title).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🚚💳' })
    expect(title2).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🚛🚛📜' })
    expect(title3).toEqual({ boxesDelivery: '📦', boxesPickup: '📦', move: '🌚🚛🎁' })
  })
})

describe('makeGoogleEventObjects', () => {
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
  })
})
