import { buildConfirmationEmail, makeTerms } from '../modules/email/email.helpers.js'
import termsData from '../modules/email/email.data.terms.json' with { type: 'json' }
import { makeCustomerCommunicationPayload } from '../../src/shared/testFixtures/orderFixtures.js'
import { exampleOptions } from './test_helper.js'

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
    const { body } = buildConfirmationEmail({ order: makeCustomerCommunicationPayload() })

    expect(body).toContain('167€')
    expect(body).toContain('Hinta: 52 €')
  })

  test('renders a structured zero boxes price', () => {
    const order = makeCustomerCommunicationPayload()
    order.boxesPrice = 0

    const { body } = buildConfirmationEmail({ order })

    expect(body).toContain('Hinta: 0 €')
  })
})
