import axios from 'axios'

const baseUrl = '/api/email'
/**
 * @param {Object} params
 * @param {string} params.confirmation
 * @param {Object} params.options
 * @param {string} params.options.distance
 * @param {Boolean} params.options.hsy
 * @param {Boolean} params.options.XL
 * @param {string} params.email
 */

export default async function sendConfirmationEmail(params) {
  try {
    const response = await axios.post(baseUrl, params)
    return response.data
  } catch (err) {
    return console.log(err.response?.data || err)
  }
}
