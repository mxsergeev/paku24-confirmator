import express from 'express'

const emailRouter = express.Router()

import sendMail, { sendMailWithAttachment } from './email.awsAPI.js'
import { makeTerms } from './email.helpers.js'
import * as authMW from '../authentication/auth.middleware.js'

emailRouter.use(authMW.authenticateAccessToken)

emailRouter.post('/send-confirmation', (req, res, next) => {
  const { orderDetails, order, options, email } = req.body

  const orderForTerms = order || options || {}
  const targetEmail = (order && order.email) || email || (orderForTerms && orderForTerms.email)

  const terms = makeTerms(orderForTerms)
  const subject = 'VARAUSVAHVISTUS'
  const body = `VARAUSVAHVISTUS\n${orderDetails}\nKIITOS VARAUKSESTANNE!\n\n${terms}`

  sendMail({
    email: targetEmail,
    subject,
    body,
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

export default emailRouter
