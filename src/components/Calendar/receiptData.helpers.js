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
