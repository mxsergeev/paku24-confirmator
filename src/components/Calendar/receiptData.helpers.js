import dayjs from 'dayjs'

function hashToFourDigits(value) {
  const source = String(value || '')
  let hash = 0

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 10000
  }

  return String(hash).padStart(4, '0')
}

export function buildStableInvoiceNumber(order, existingInvoiceNumber = '') {
  const normalizedExisting = String(existingInvoiceNumber || '').trim()
  if (normalizedExisting) return normalizedExisting

  const orderDate = dayjs(order?.date)
  const datePart = orderDate.isValid() ? orderDate.format('YYYYMMDD') : dayjs().format('YYYYMMDD')

  const stableSeed = [order?.id, order?._id, order?.name, order?.email, order?.phone, order?.date]
    .filter(Boolean)
    .join('|')

  const suffix = hashToFourDigits(stableSeed || datePart)
  return `${datePart}${suffix}`
}

function formatAddressForReceipt(address) {
  if (!address) return ''
  if (typeof address === 'string') return address

  const parts = [address.street, address.index, address.city].filter(Boolean)
  return parts.join(', ')
}

export function getReceiptServicePrice(order, fallback = '') {
  return order?.service?.pricePerHour ?? fallback
}

export function getReceiptBoxesPrice(order, fallback) {
  return order?.boxesPrice ?? fallback
}

export function getReceiptTotal(value, fallback) {
  return value === null || value === undefined || String(value).trim() === '' ? fallback : value
}

export function buildReceiptDraftFromOrder(order = {}) {
  const safeOrder = order || {}
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const dueDate = defaultDueDate.toISOString().slice(0, 10)
  const totalAmount =
    typeof safeOrder.price === 'number' || typeof safeOrder.price === 'string'
      ? String(safeOrder.price)
      : ''

  return {
    customerName: safeOrder.name || '',
    customerEmail: safeOrder.email || '',
    customerAddress: formatAddressForReceipt(safeOrder.address),
    totalAmount,
    serviceName: safeOrder.service?.name || '',
    serviceHours: safeOrder.duration || '',
    unitPrice: getReceiptServicePrice(safeOrder),
    dueDate,
    invoiceNumber: buildStableInvoiceNumber(safeOrder, safeOrder.invoiceNumber),
  }
}

export function toDateInputValue(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) return source

  const finnishDateMatch = source.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (finnishDateMatch) {
    const [, day, month, year] = finnishDateMatch
    return `${year}-${month}-${day}`
  }

  return ''
}

export function formatDateForReceipt(value, fallback) {
  const source = String(value || '').trim()
  if (!source) return fallback

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(source)) return source

  const isoDateMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return `${day}.${month}.${year}`
  }

  const parsed = dayjs(source)
  if (parsed.isValid()) return parsed.format('DD.MM.YYYY')

  return fallback
}

export function normalizeDocumentType(value) {
  return String(value || '').toLowerCase() === 'invoice' ? 'invoice' : 'receipt'
}

export function resolveDocumentType(value, fallbackValue = 'receipt') {
  const fallback = normalizeDocumentType(fallbackValue)
  const normalized = String(value || '').toLowerCase()
  return normalized === 'invoice' || normalized === 'receipt' ? normalized : fallback
}

export function normalizeReceiptDraft(draft, fallbackDocumentType = 'receipt') {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null

  return {
    ...draft,
    documentType: resolveDocumentType(draft.documentType, fallbackDocumentType),
  }
}
