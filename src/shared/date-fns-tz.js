/**
 * Shared date-fns-tz functions with pre-set timezone
 *
 * Using an older version of date-fns-tz to maintain compatibility with date-fns version 2.x that is already bundled with some other dependencies.
 *
 * Re-exporting the functions using names from the newer version for easier future migration.
 */

import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone as _formatInTimeZone } from 'date-fns-tz'

export const HELSINKI_TIMEZONE = 'Europe/Helsinki'

const TIMEZONE = process.env.VITE_TIMEZONE || HELSINKI_TIMEZONE
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Return whether a value is a date-only string in the canonical API format.
 * Date-only values intentionally do not include a time or timezone.
 */
export function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value)
}

/**
 * Validate a canonical date-only string and return its UTC midnight instant.
 */
export function parseDateOnly(value, fieldName = 'date') {
  if (!isDateOnly(value)) throw new Error(`Invalid ${fieldName}`)

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(0)
  parsed.setUTCFullYear(year, month - 1, day)
  parsed.setUTCHours(0, 0, 0, 0)

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ${fieldName}`)
  }

  return parsed
}

/**
 * Parse a date/time value as an instant.
 *
 * Date instances and strings with an explicit timezone already represent an
 * instant. Strings without a timezone are interpreted as wall-clock time in
 * the supplied timezone.
 */
export function parseDateTime(value, fieldName = 'date', timezone = HELSINKI_TIMEZONE) {
  if (value === null || value === undefined) throw new Error(`Invalid ${fieldName}`)

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error(`Invalid ${fieldName}`)
    return new Date(value.getTime())
  }

  let parsed

  if (typeof value === 'string') {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    parsed = hasTimezone ? new Date(value) : zonedTimeToUtc(value, timezone)
  } else {
    parsed = new Date(value)
  }

  if (!Number.isFinite(parsed.getTime())) throw new Error(`Invalid ${fieldName}`)
  return parsed
}

export const fromZonedTime = (date, tz = TIMEZONE) => zonedTimeToUtc(date, tz)
export const toZonedTime = (date, tz = TIMEZONE) => utcToZonedTime(date, tz)
export const formatInTimeZone = (date, formatStr, tz = TIMEZONE) => _formatInTimeZone(date, tz, formatStr)
