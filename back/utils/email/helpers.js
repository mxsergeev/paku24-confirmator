const termsData = require('../data/terms.json')

/**
 * @param {object} options
 * @param {boolean} options.hsy
 * @param {string} options.distance
 */

function makeTerms(options) {
  if (options.hsy)
    return `${termsData[options.distance]}\n\n${termsData.hsy}\n\n${
      termsData.defaultTerms
    }`

  return `${termsData[options.distance]}\n\n${termsData.defaultTerms}`
}

module.exports = { makeTerms }
