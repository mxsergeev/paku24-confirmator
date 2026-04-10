import express from 'express'

const emailRouter = express.Router()

import sendMail, { sendMailWithAttachment } from './email.awsAPI.js'
import { buildConfirmationEmail, makeTerms } from './email.helpers.js'
import dayjs from '../../../src/shared/dayjs.js'
import * as authMW from '../authentication/auth.middleware.js'

emailRouter.use(authMW.authenticateAccessToken)

emailRouter.post('/send-confirmation', (req, res, next) => {
  const { orderDetails, order, options, email, lang } = req.body

  const orderForTerms = order || options || {}
  const targetEmail = (order && order.email) || email || (orderForTerms && orderForTerms.email)

  const terms = makeTerms(orderForTerms)
  const { subject, body } = buildConfirmationEmail({
    order,
    orderDetails,
    terms,
    lang: lang || order?.lang || order?.locale,
  })

  sendMail({
    email: targetEmail,
    subject,
    body,
    html: true,
  })
    .then(() => res.status(200).send({ message: `Email sent to ${targetEmail}.` }))
    .catch((err) => next(err))
})

emailRouter.post('/send-receipt', (req, res, next) => {
  const { email, subject, body, pdfBase64, fileName } = req.body || {}
  const hasPdfBase64 = typeof pdfBase64 === 'string' && pdfBase64.trim().length > 0

  if (!email || !hasPdfBase64) {
    return res.status(400).send({ error: 'Email and pdfBase64 are required.' })
  }

  return sendMailWithAttachment({
    email,
    subject: subject || 'Receipt',
    body: body || 'Please find your receipt attached.',
    pdfBase64,
    fileName: fileName || 'receipt.pdf',
  })
    .then(() => res.status(200).send({ message: `Receipt sent to ${email}.` }))
    .catch((err) => next(err))
})

emailRouter.post('/send-cancellation', (req, res, next) => {
  const { order, email } = req.body

  const targetEmail = (order && order.email) || email
  const clientName = (order && order.name) || 'Valued customer'

  if (!targetEmail) {
    return res.status(400).send({ error: 'Email address is required.' })
  }

  const subject = 'VARAUKSEN PERUUTUS'
  const serviceName = order?.service?.name || ''
  const dateStr = order?.date ? dayjs(order.date).format('DD.MM.YYYY HH:mm') : ''
  const details = serviceName || dateStr ? `Varaus: ${serviceName} ${dateStr}`.trim() : ''

  const body = `Arvoisa ${clientName},\n\nVarausksesi on peruutettu.\n${
    details ? `\n${details}\n` : '\n'
  }\nMikäli sinulla on kysymyksiä, ole yhteydessä meihin.\n\nYstävällisin terveisin`

  sendMail({
    email: targetEmail,
    subject,
    body,
  })
    .then(() => res.status(200).send({ message: `Cancellation email sent to ${targetEmail}.` }))
    .catch((err) => next(err))
})

export default emailRouter
