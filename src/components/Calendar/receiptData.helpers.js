import { buildStableInvoiceNumber as buildSharedStableInvoiceNumber } from '../../shared/invoiceNumber.js'
import {
  formatHelsinkiCalendarDate,
  formatHelsinkiInstant,
  isIsoInstant,
} from '../../shared/date-fns-tz.js'
import { getOrderPricing } from '../../shared/orderPricing.js'
import feesConfig from '../../data/fees.json'

export const INVOICE_TERMS = {
  paymentTermDays: 14,
  reminderDays: 8,
  latePaymentInterestPercent: 8,
}

const PAYMENT_TYPE_FEE_NAME = 'paymentTypeFee'

export function buildStableInvoiceNumber(order, existingInvoiceNumber = '') {
  return buildSharedStableInvoiceNumber(order, existingInvoiceNumber, { invalidDate: 'today' })
}

function formatAddressForReceipt(address) {
  if (!address) return ''

  const parts = [address.street, address.index, address.city].filter(Boolean)
  return parts.join(', ')
}

function getDefaultDueDate() {
  const currentHelsinkiDate = formatHelsinkiCalendarDate(new Date(), 'current date')
  const [year, month, day] = currentHelsinkiDate.split('-').map(Number)
  const dueDate = new Date(
    Date.UTC(year, month - 1, day + INVOICE_TERMS.paymentTermDays),
  )

  return dueDate.toISOString().slice(0, 10)
}

export function getDocumentPricing(order, documentType = 'receipt') {
  const pricing = getOrderPricing(order)
  if (normalizeDocumentType(documentType) !== 'invoice') return pricing

  const paymentTypeFee = feesConfig.find((fee) => fee?.name === PAYMENT_TYPE_FEE_NAME)
  const configuredFeeAmount = Number(paymentTypeFee?.amount)
  const fees = pricing.fees.map((fee) => ({ ...fee }))
  const hasPositivePaymentTypeFee = fees.some(
    (fee) => fee?.name === PAYMENT_TYPE_FEE_NAME && Number(fee.amount) > 0,
  )

  if (
    !hasPositivePaymentTypeFee &&
    paymentTypeFee &&
    Number.isFinite(configuredFeeAmount) &&
    configuredFeeAmount > 0
  ) {
    fees.push({ ...paymentTypeFee, amount: configuredFeeAmount })
  }

  return {
    ...pricing,
    fees,
    price:
      hasPositivePaymentTypeFee || !paymentTypeFee || !Number.isFinite(configuredFeeAmount)
        ? pricing.price
        : pricing.price + configuredFeeAmount,
  }
}

export function buildReceiptDraftFromOrder(order = {}, documentType = 'receipt') {
  const safeOrder = order || {}
  const dueDate = getDefaultDueDate()
  let totalAmount = ''
  try {
    totalAmount = String(getDocumentPricing(safeOrder, documentType).price)
  } catch {
    // The helper is also used while the receipt shell is initializing.
  }

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
