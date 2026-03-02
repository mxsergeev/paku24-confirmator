/**
 * Shared dayjs instance with necessary plugins
 */

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isoWeek from 'dayjs/plugin/isoWeek.js'

dayjs.extend(utc)
dayjs.extend(isSameOrAfter)
dayjs.extend(isoWeek)

export default dayjs
