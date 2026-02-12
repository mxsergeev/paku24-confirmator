const { makeTerms } = require('../modules/email/email.helpers')
const termsData = require('../modules/email/email.data.terms')
const { exampleOptions } = require('./test_helper')

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
