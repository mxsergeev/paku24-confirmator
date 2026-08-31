import { formatHelsinkiInstant } from './date-fns-tz.js'

function hashToFourDigits(value) {
  const source = String(value || '')
  let hash = 0

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 10000
  }

  return String(hash).padStart(4, '0')
}

/**
 * Generate a stable invoice number based on order data.
 * If an invoiceNumber already exists, it will be returned as-is.
 *
 * The frontend can opt into today's date for malformed orders while the
 * backend keeps its strict validation by using the default "throw" behavior.
 *
 * @param {Object} order - Order object with date, id, name, email, phone
 * @param {String} existingInvoiceNumber - Existing invoice number (if any)
 * @param {Object} options - Invalid-date handling options
 * @param {'throw'|'today'} options.invalidDate - Whether to throw or use today's date
 * @returns {String} Invoice number in format YYYYMMDDXXX (order date + hash)
 * @throws {Error} if order date is not valid and invalidDate is "throw"
 */
export function buildStableInvoiceNumber(
  order = {},
  existingInvoiceNumber = '',
  { invalidDate = 'throw' } = {},
) {
  const normalizedExisting = String(existingInvoiceNumber || '').trim()
  if (normalizedExisting) return normalizedExisting

  // A missing order date must remain invalid for the backend's strict
  // generation path instead of silently becoming today.
  let datePart = null
  if (order?.date !== undefined && order?.date !== null) {
    try {
      datePart = formatHelsinkiInstant(order.date, 'yyyyMMdd', 'order date')
    } catch {
      datePart = null
    }
  }
  if (!datePart && invalidDate === 'today') {
    datePart = formatHelsinkiInstant(new Date(), 'yyyyMMdd', 'today')
  }

  if (!datePart) {
    throw new Error(
      'Cannot generate invoice number: order.date is missing or invalid. Provide a valid date for the order.',
    )
  }

  const stableSeed = [order?.id, order?.name, order?.email, order?.phone, order?.date]
    .filter(Boolean)
    .join('|')

  const suffix = hashToFourDigits(stableSeed || datePart)
  return `${datePart}${suffix}`
}

export default {
  buildStableInvoiceNumber,
}
