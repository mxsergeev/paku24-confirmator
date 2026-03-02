import termsData from './email.data.terms.json' with { type: 'json' }

/**
 * @param {object} order
 * @param {boolean} order.hsy
 * @param {string} order.distance
 */

function makeTerms(order) {
  if (order.hsy)
    return `${termsData[order.distance]}\n\n${termsData.hsy}\n\n${termsData.defaultTerms}`

  return `${termsData[order.distance]}\n\n${termsData.defaultTerms}`
}

export { makeTerms }
