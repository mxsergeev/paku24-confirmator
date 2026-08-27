import { describe, expect, it } from 'vitest'
import fees from '../data/fees.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }
import { calculateAutomaticFees, getAvailableFees } from './fees.js'

const emptyAddress = { street: '', index: '', city: '', floor: 0, elevator: false }

const makeOrder = (overrides = {}) => ({
  date: new Date('2026-03-10T09:00:00.000Z'),
  service: services[0],
  paymentType: paymentTypes[0],
  address: emptyAddress,
  destination: emptyAddress,
  extraAddresses: [],
  ...overrides,
})

describe('getAvailableFees', () => {
  it('returns the base fees without the stair fee configuration', () => {
    const result = getAvailableFees()

    expect(result).toHaveLength(5)
    expect(result.map((fee) => fee.name)).toEqual(
      fees.filter((fee) => fee.name !== 'stairsFee').map((fee) => fee.name),
    )
  })

  it('adds one calculated stair fee for each qualifying address', () => {
    const result = getAvailableFees(
      makeOrder({
        service: services[1],
        address: { ...emptyAddress, street: 'Testikatu 1 A 2', floor: 4 },
        destination: { ...emptyAddress, street: 'Testikatu 2 B 3', floor: 6 },
        extraAddresses: [{ ...emptyAddress, street: 'Testikatu 3 C 4', floor: 5, elevator: true }],
      }),
    )

    expect(result).toContainEqual({
      name: 'stairsFee_0',
      label: 'KERROSLISÄ (Testikatu 1 A 2)',
      amount: 20,
    })
    expect(result).toContainEqual({
      name: 'stairsFee_1',
      label: 'KERROSLISÄ (Testikatu 2 B 3)',
      amount: 40,
    })
    expect(result.some((fee) => fee.name === 'stairsFee_2')).toBe(false)
  })

  it('does not add stair fees when the service has no stair multiplier', () => {
    const result = getAvailableFees(
      makeOrder({
        address: { ...emptyAddress, floor: 4 },
        destination: { ...emptyAddress, floor: 4 },
      }),
    )

    expect(result.some((fee) => fee.name.startsWith('stairsFee'))).toBe(false)
  })
})

describe('calculateAutomaticFees', () => {
  it('returns no fees for a regular weekday morning', () => {
    expect(calculateAutomaticFees(makeOrder())).toEqual([])
  })

  it('preserves the existing weekend, night, payment, and stair fee rules', () => {
    const result = calculateAutomaticFees(
      makeOrder({
        date: new Date('2026-03-07T21:00:00.000Z'),
        service: services[1],
        paymentType: paymentTypes[2],
        address: { ...emptyAddress, street: 'Testikatu 1 A 2', floor: 4 },
      }),
    )

    expect(result).toEqual([
      { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
      { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
      { name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 },
      { name: 'stairsFee_0', label: 'KERROSLISÄ (Testikatu 1 A 2)', amount: 20 },
    ])
  })

  it('uses the month-boundary fee on weekdays but not on weekends', () => {
    expect(
      calculateAutomaticFees(makeOrder({ date: new Date('2026-03-31T09:00:00.000Z') })),
    ).toEqual([{ name: 'startOrEndOfMonthFee', label: 'KUUNVAIHDELISÄ', amount: 15 }])
    expect(
      calculateAutomaticFees(makeOrder({ date: new Date('2026-04-04T09:00:00.000Z') })),
    ).toEqual([{ name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 }])
  })

  it('never includes the unimplemented holiday fee', () => {
    const result = calculateAutomaticFees(makeOrder({ date: new Date('2026-04-05T09:00:00.000Z') }))

    expect(result.some((fee) => fee.name === 'holidayFee')).toBe(false)
  })
})
