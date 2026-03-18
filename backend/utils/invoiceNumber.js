import dayjs from '../../src/shared/dayjs.js'

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
 * @param {Object} order - Order object with date, id, _id, name, email, phone
 * @param {String} existingInvoiceNumber - Existing invoice number (if any)
 * @returns {String} Invoice number in format YYYYMMDDXXX (order date + hash)
 * @throws {Error} if order date is not valid
 */
export function buildStableInvoiceNumber(order = {}, existingInvoiceNumber = '') {
  const normalizedExisting = String(existingInvoiceNumber || '').trim()
  if (normalizedExisting) return normalizedExisting

  const orderDate = dayjs(order?.date)

  if (!orderDate.isValid()) {
    throw new Error(
      'Cannot generate invoice number: order.date is missing or invalid. Provide a valid date for the order.'
    )
  }

  const datePart = orderDate.format('YYYYMMDD')

  const stableSeed = [order?.id, order?._id, order?.name, order?.email, order?.phone, order?.date]
    .filter(Boolean)
    .join('|')

  const suffix = hashToFourDigits(stableSeed || datePart)
  return `${datePart}${suffix}`
}

export default {
  buildStableInvoiceNumber,
}
