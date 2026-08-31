import { buildStableInvoiceNumber as buildSharedStableInvoiceNumber } from '../../shared/invoiceNumber.js'
import { formatHelsinkiInstant, isIsoInstant } from '../../shared/date-fns-tz.js'

export function buildStableInvoiceNumber(order, existingInvoiceNumber = '') {
  return buildSharedStableInvoiceNumber(order, existingInvoiceNumber, { invalidDate: 'today' })
}

function formatAddressForReceipt(address) {
  if (!address) return ''
  if (typeof address === 'string') return address

  const parts = [address.street, address.index, address.city].filter(Boolean)
  return parts.join(', ')
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
    unitPrice: safeOrder?.service?.pricePerHour ?? '',
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

  if (isIsoInstant(source)) {
    try {
      return formatHelsinkiInstant(source, 'dd.MM.yyyy', 'receipt date')
    } catch {
      return fallback
    }
  }

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
