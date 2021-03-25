const {
  makeTitle,
  makeColor,
  createEvent,
} = require('../utils/calendar/helpers')
const { exampleOrder, exampleOptions } = require('./test_helper')
const iconsData = require('../utils/data/icons')
const colorsData = require('../utils/data/colors')

describe('makeTitle', () => {
  test('title created right', () => {
    const title = makeTitle(exampleOrder, exampleOptions)
    const title2 = makeTitle(
      {
        ...exampleOrder,
        serviceName: 'Paku ja kaksi muuttomiestä',
        paymentType: 'Lasku',
        time: '11:00',
        duration: 3,
      },
      { ...exampleOptions, XL: true, distance: 'outsideCapital' }
    )
    const title3 = makeTitle(
      {
        ...exampleOrder,
        serviceName: 'Paku ja mies',
        paymentType: 'Käteinen',
        time: '21:00',
        duration: 1,
        fees: {
          array: ['YÖLISÄ'],
        },
      },
      { ...exampleOptions, distance: 'fromCapitalToOutside' }
    )

    expect(title).toBe('🚚💳17:00(2h)')
    expect(title2).toBe('XL🚧🚛🚛📜11:00(3h)')
    expect(title3).toBe('🌚🛒🎁21:00(1h)')
  })
})

describe('makeColor', () => {
  test('color chosen right', () => {
    const color = makeColor(exampleOrder, exampleOptions)
    const color2 = makeColor(
      {
        ...exampleOrder,
        serviceName: 'Paku ja kaksi muuttomiestä',
      },
      { ...exampleOptions, secondCar: true }
    )
    const color3 = makeColor(
      {
        ...exampleOrder,
        serviceName: 'Paku ja mies',
      },
      exampleOptions
    )

    expect(color).toBe(colorsData['Paku ja kuski'])
    expect(color2).toBe(colorsData.secondCar['Paku ja kaksi muuttomiestä'])
    expect(color3).toBe(colorsData['Paku ja mies'])
  })
})

describe('createEvent', () => {
  test('start date time and end date time of event object are correct', () => {
    const title = makeTitle(exampleOrder, exampleOptions)
    const color = makeColor(exampleOrder, exampleOptions)
    const eventObject = createEvent({
      title,
      color,
      date: exampleOrder.date.original,
      duration: exampleOrder.duration,
    })
    const eventObject2 = createEvent({
      title,
      color,
      date: new Date('2021-07-10 23:00'),
      duration: 4,
    })

    expect(eventObject.start.dateTime).toBe(
      exampleOrder.date.original.toISOString()
    )
    expect(eventObject.end.dateTime).toBe(
      new Date('2021-04-22 19:00').toISOString()
    )
    expect(eventObject2.start.dateTime).toBe(
      new Date('2021-07-10 23:00').toISOString()
    )
    expect(eventObject2.end.dateTime).toBe(
      new Date('2021-07-11 3:00').toISOString()
    )
  })
})
