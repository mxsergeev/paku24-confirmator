/**
 * Shared date-fns-tz functions with pre-set timezone
 *
 * Using an older version of date-fns-tz to maintain compatibility with date-fns version 2.x that is already bundled with some other dependencies.
 *
 * Re-exporting the functions using names from the newer version for easier future migration.
 */

const { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } = require('date-fns-tz')

const TIMEZONE = process.env.VITE_TIMEZONE || 'Europe/Helsinki'

module.exports = {
  fromZonedTime: (date, tz = TIMEZONE) => zonedTimeToUtc(date, tz),
  toZonedTime: (date, tz = TIMEZONE) => utcToZonedTime(date, tz),
  formatInTimeZone: (date, formatStr, tz = TIMEZONE) => formatInTimeZone(date, tz, formatStr),
}
