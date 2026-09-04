import { buildConfirmationEmail, formatDate, makeTerms } from '../modules/email/email.helpers.js'
import termsData from '../modules/email/email.data.terms.json' with { type: 'json' }
import { makeCustomerCommunicationPayload } from '../../src/shared/testFixtures/orderFixtures.js'
import { exampleOptions } from './test_helper.js'

function makeConfirmationOrder(overrides = {}) {
  return {
    ...makeCustomerCommunicationPayload(),
    pricingOverrides: { price: 167, fees: [], boxesPrice: 52 },
    ...overrides,
  }
}

describe('makeTerms', () => {
  test('terms created right', () => {
    const terms = makeTerms(exampleOptions)
    const terms2 = makeTerms({
      ...exampleOptions,
      hsy: true,
      distance: 'outsideCapital',
    })
    const terms3 = makeTerms({
      ...exampleOptions,
      distance: 'fromCapitalToOutside',
    })

    expect(terms).toBe(`${termsData.insideCapital}\n\n${termsData.defaultTerms}`)
    expect(terms2).toBe(
      `${termsData.outsideCapital}\n\n${termsData.hsy}\n\n${termsData.defaultTerms}`
    )
    expect(terms3).toBe(`${termsData.fromCapitalToOutside}\n\n${termsData.defaultTerms}`)
  })
})

describe('buildConfirmationEmail', () => {
  test('renders structured materialized total and boxes price', () => {
    const { body } = buildConfirmationEmail({ order: makeConfirmationOrder() })

    expect(body).toContain('167€')
    expect(body).toContain('Hinta: 52 €')
  })

  test('renders a structured zero boxes price', () => {
    const order = makeConfirmationOrder({
      pricingOverrides: { price: 167, fees: [], boxesPrice: 0 },
    })

    const { body } = buildConfirmationEmail({ order })

    expect(body).toContain('Hinta: 0 €')
  })

  test('uses the active payment fee in the confirmation email', () => {
    const order = makeConfirmationOrder({
      paymentType: { id: '3', name: 'Company invoice', fee: 123 },
      pricingOverrides: { price: 167, fees: null, boxesPrice: 52 },
    })

    const { body } = buildConfirmationEmail({ order })

    expect(body).toContain('5€')
    expect(body).not.toContain('123€')
  })

  test('renders order and box instants in Helsinki time', () => {
    const order = makeConfirmationOrder()
    order.date = '2026-01-15T07:00:00.000Z'
    order.boxes.deliveryDate = '2026-01-16T07:00:00.000Z'
    order.boxes.returnDate = '2026-01-17T07:00:00.000Z'

    const { body } = buildConfirmationEmail({ order })

    expect(body).toContain('15.01.2026 09:00 (±15min)')
    expect(body).toContain('16.01.2026 09:00')
    expect(body).toContain('17.01.2026 09:00')
  })

  test('keeps date-only box values date-only in confirmation email', () => {
    const order = makeConfirmationOrder()
    order.boxes.deliveryDate = new Date('2026-03-12T00:00:00.000Z')
    order.boxes.deliveryHasTime = false
    order.boxes.returnDate = new Date('2026-03-20T00:00:00.000Z')
    order.boxes.returnHasTime = false

    const { body } = buildConfirmationEmail({ order })

    expect(body).toContain('12.03.2026')
    expect(body).toContain('20.03.2026')
    expect(body).not.toContain('12.03.2026 00:00')
    expect(body).not.toContain('20.03.2026 00:00')
  })
})

describe('email date rendering', () => {
  test('formats cancellation instants in Helsinki time', () => {
    expect(formatDate('2026-01-15T07:00:00.000Z', 'fi', 'order date')).toBe('15.01.2026 09:00')
  })

  test('formats all-day box dates without a time', () => {
    expect(formatDate(new Date('2026-03-12T23:00:00.000Z'), 'fi', 'box delivery date', false)).toBe(
      '13.03.2026',
    )
  })
})
