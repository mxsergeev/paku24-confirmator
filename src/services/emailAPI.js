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
 * @param {string} params.orderDetails
 * @param {Object} params.order
 */

export default async function sendConfirmationEmail(params) {
  const payload = {
    ...params,
    lang: params?.lang || getOrderLanguage(params?.order),
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
