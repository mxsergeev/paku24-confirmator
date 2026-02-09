/**
 * Shared dayjs instance with necessary plugins
 */

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter')
const isoWeek = require('dayjs/plugin/isoWeek')

dayjs.extend(utc)
dayjs.extend(isSameOrAfter)
dayjs.extend(isoWeek)

module.exports = dayjs
