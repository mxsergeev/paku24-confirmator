import interceptor from './interceptor'

const baseUrl = '/api/email'

/**
 * @param {Object} params
 * @param {string} params.orderId Persisted order ID.
 * @param {string} [params.lang] Confirmation language.
 */

export default async function sendConfirmationEmail(params = {}) {
  const payload = { orderId: params?.orderId }
  if (params?.lang) payload.lang = params.lang

  const response = await interceptor.axiosInstance.post(`${baseUrl}/send-confirmation`, payload)
  return response.data
}

export async function sendReceiptEmail(params = {}) {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/send-receipt`, params)
  return response.data
}

export async function sendCancellationEmail(params = {}) {
  const response = await interceptor.axiosInstance.post(`${baseUrl}/send-cancellation`, {
    orderId: params?.orderId,
  })
  return response.data
}
