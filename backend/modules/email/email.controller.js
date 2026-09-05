import express from 'express'

const emailRouter = express.Router()

import sendMail, { sendMailWithAttachment } from './email.awsAPI.js'
import { buildConfirmationEmail, formatDate, makeTerms } from './email.helpers.js'
import * as authMW from '../authentication/auth.middleware.js'
import { getOrderById } from '../orderPool/orderPool.service.js'

emailRouter.use(authMW.authenticateAccessToken)

emailRouter.post('/send-confirmation', async (req, res, next) => {
  try {
    const { orderId, lang } = req.body || {}
    if (typeof orderId !== 'string' || !orderId) {
      return res.status(400).send({ error: 'Order ID is required.' })
    }

    const order = await getOrderById(orderId)
    if (order.deletedAt) {
      return res.status(400).send({ error: 'Deleted orders cannot send messages.' })
    }

    const targetEmail = order.email
    if (!targetEmail) {
      return res.status(400).send({ error: 'Email address is required.' })
    }

    const terms = makeTerms(order)
    const { subject, body } = buildConfirmationEmail({ order, terms, lang })

    await sendMail({
      email: targetEmail,
      subject,
      body,
      html: true,
    })
    return res.status(200).send({ message: `Email sent to ${targetEmail}.` })
  } catch (err) {
    return next(err)
  }
})

emailRouter.post('/send-receipt', (req, res, next) => {
  const { email, subject, body, pdfBase64, fileName, documentType } = req.body || {}
  const hasPdfBase64 = typeof pdfBase64 === 'string' && pdfBase64.trim().length > 0

  if (!email || !hasPdfBase64) {
    return res.status(400).send({ error: 'Email and pdfBase64 are required.' })
  }

  const isInvoice = documentType === 'invoice'
  const documentLabel = isInvoice ? 'Invoice' : 'Receipt'

  return sendMailWithAttachment({
    email,
    subject: subject || documentLabel,
    body: body || `Please find your ${documentLabel.toLowerCase()} attached.`,
    pdfBase64,
    fileName: fileName || `${documentLabel.toLowerCase()}.pdf`,
    documentType: isInvoice ? 'invoice' : 'receipt',
  })
    .then(() => res.status(200).send({ message: `${documentLabel} sent to ${email}.` }))
    .catch((err) => next(err))
})

emailRouter.post('/send-cancellation', async (req, res, next) => {
  try {
    const { orderId } = req.body || {}
    if (typeof orderId !== 'string' || !orderId) {
      return res.status(400).send({ error: 'Order ID is required.' })
    }

    const order = await getOrderById(orderId)
    if (order.deletedAt) {
      return res.status(400).send({ error: 'Deleted orders cannot send messages.' })
    }

    const targetEmail = order.email
    if (!targetEmail) {
      return res.status(400).send({ error: 'Email address is required.' })
    }

    const subject = 'VARAUKSEN PERUUTUS'
    const clientName = order.name || 'Valued customer'
    const serviceName = order?.service?.name || ''
    const dateStr = order?.date ? formatDate(order.date, 'fi', 'order date') : ''
    const details = serviceName || dateStr ? `Varaus: ${serviceName} ${dateStr}`.trim() : ''

    const body = `Arvoisa ${clientName},\n\nVarausksesi on peruutettu.\n${
      details ? `\n${details}\n` : '\n'
    }\nMikäli sinulla on kysymyksiä, ole yhteydessä meihin.\n\nYstävällisin terveisin`

    await sendMail({ email: targetEmail, subject, body })
    return res.status(200).send({ message: `Cancellation email sent to ${targetEmail}.` })
  } catch (err) {
    return next(err)
  }
})

export default emailRouter
