import interceptor from './interceptor'

const baseUrl = '/api/email'

function getOrderLanguage(order, fallback = 'fi') {
  const orderLang = String(order?.lang || order?.locale || '').toLowerCase()
  if (orderLang.startsWith('en')) return 'en'
  if (orderLang.startsWith('fi')) return 'fi'

  return fallback
}
/**
 * @param {Object} params
 * @param {Object} params.order Structured communication order with materialized pricing.
 * @param {string} [params.email] Explicit recipient fallback when order.email is absent.
 * @param {string} [params.lang] Confirmation language; defaults to the order language or Finnish.
 */

export default async function sendConfirmationEmail(params = {}) {
  const order = params?.order
  const payload = {
    order,
    email: params?.email,
    lang: params?.lang || getOrderLanguage(order),
  }

  const response = await interceptor.axiosInstance.post(`${baseUrl}/send-confirmation`, payload)
  return response.data
}

export async function sendReceiptEmail(params = {}) {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/send-receipt`, params)
  return response.data
}

export async function sendCancellationEmail(params = {}) {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/send-cancellation`, params)
  return response.data
}
