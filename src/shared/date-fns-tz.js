/**
 * Shared date-fns-tz functions with pre-set timezone
 *
 * Using an older version of date-fns-tz to maintain compatibility with date-fns version 2.x that is already bundled with some other dependencies.
 *
 * Re-exporting the functions using names from the newer version for easier future migration.
 */

import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone as _formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = process.env.VITE_TIMEZONE || 'Europe/Helsinki'

export const fromZonedTime = (date, tz = TIMEZONE) => zonedTimeToUtc(date, tz)
export const toZonedTime = (date, tz = TIMEZONE) => utcToZonedTime(date, tz)
export const formatInTimeZone = (date, formatStr, tz = TIMEZONE) => _formatInTimeZone(date, tz, formatStr)
