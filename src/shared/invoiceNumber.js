import dayjs from './dayjs.js'

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
 * @param {Object} order - Order object with date, id, _id, name, email, phone
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

  // dayjs(undefined) resolves to the current date, but a missing order date
  // must remain invalid for the backend's strict generation path.
  const orderDate =
    order?.date === undefined || order?.date === null ? dayjs('') : dayjs(order.date)
  const datePart = orderDate.isValid()
    ? orderDate.format('YYYYMMDD')
    : invalidDate === 'today'
      ? dayjs().format('YYYYMMDD')
      : null

  if (!datePart) {
    throw new Error(
      'Cannot generate invoice number: order.date is missing or invalid. Provide a valid date for the order.',
    )
  }

  const stableSeed = [order?.id, order?._id, order?.name, order?.email, order?.phone, order?.date]
    .filter(Boolean)
    .join('|')

  const suffix = hashToFourDigits(stableSeed || datePart)
  return `${datePart}${suffix}`
}

export default {
  buildStableInvoiceNumber,
}
