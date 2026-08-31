/**
 * Shared date-fns-tz functions with pre-set timezone
 *
 * Using an older version of date-fns-tz to maintain compatibility with date-fns version 2.x that is already bundled with some other dependencies.
 *
 * Re-exporting the functions using names from the newer version for easier future migration.
 */

import { formatInTimeZone as _formatInTimeZone } from 'date-fns-tz'
import { OrderValidationError } from './orderPrimitives.js'

export const HELSINKI_TIMEZONE = 'Europe/Helsinki'

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:?\d{2})$/i

/**
 * Return whether a value is a date-only string in the canonical API format.
 * Date-only values intentionally do not include a time or timezone.
 */
export function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY_PATTERN.test(value)
}

// Validate once and produce UTC midnight for the conversion helper below.
function parseCalendarDateToUtc(value, fieldName) {
  if (!isDateOnly(value)) throw new OrderValidationError(`Invalid ${fieldName}`)

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
    throw new OrderValidationError(`Invalid ${fieldName}`)
  }

  return parsed
}

/**
 * Validate and return a canonical calendar date without converting it to an
 * instant. Calendar dates intentionally remain strings at persistence and API
 * boundaries so that they can be rendered as all-day values.
 */
export function parseCalendarDate(value, fieldName = 'date') {
  parseCalendarDateToUtc(value, fieldName)
  return value
}

/**
 * Convert a validated calendar date to a UTC-midnight Date when an API needs
 * a Date for arithmetic. This is deliberately separate from parseCalendarDate
 * so date-only values are not accidentally treated as instants.
 */
export function calendarDateToUtc(value, fieldName = 'date') {
  return parseCalendarDateToUtc(value, fieldName)
}

/**
 * Return whether a string has an explicit timezone suffix and ISO datetime
 * shape. Calendar validity is checked separately by callers where needed.
 */
export function isIsoInstant(value) {
  return typeof value === 'string' && ISO_INSTANT_PATTERN.test(value)
}

/**
 * Parse a date/time value that unambiguously represents an instant.
 *
 * Date instances and strings with an explicit timezone represent an instant.
 * Timezone-less strings are rejected; callers that really receive wall-clock
 * input must convert it explicitly for the relevant timezone.
 */
export function parseInstant(value, fieldName = 'date') {
  if (value === null || value === undefined) throw new OrderValidationError(`Invalid ${fieldName}`)

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new OrderValidationError(`Invalid ${fieldName}`)
    return new Date(value.getTime())
  }

  if (!isIsoInstant(value)) {
    throw new OrderValidationError(`Invalid ${fieldName}: expected an absolute instant`)
  }

  // JavaScript normalizes impossible dates in some ISO strings, so validate
  // the calendar portion before accepting the parsed instant.
  parseCalendarDate(value.slice(0, 10), fieldName)
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) throw new OrderValidationError(`Invalid ${fieldName}`)
  return parsed
}

export const formatInTimeZone = (date, formatStr, tz = HELSINKI_TIMEZONE) =>
  _formatInTimeZone(date, tz, formatStr)

/**
 * Format an absolute instant for customers and staff in the business timezone.
 * Unlike Date#toString or Date#toLocaleString, this is independent of the host timezone.
 */
export function formatHelsinkiInstant(value, formatStr, fieldName = 'date') {
  return formatInTimeZone(parseInstant(value, fieldName), formatStr, HELSINKI_TIMEZONE)
}

/**
 * Return a YYYY-MM-DD calendar value in the business timezone.
 * Date-only values stay date-only and are never converted through midnight.
 */
export function formatHelsinkiCalendarDate(value, fieldName = 'date') {
  if (isDateOnly(value)) {
    return parseCalendarDate(value, fieldName)
  }

  return formatHelsinkiInstant(value, 'yyyy-MM-dd', fieldName)
}

export function isSameHelsinkiCalendarDate(left, right) {
  return formatHelsinkiCalendarDate(left) === formatHelsinkiCalendarDate(right)
}
