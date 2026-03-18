import AWS from 'aws-sdk'
import * as logger from '../../utils/logger.js'
import { SOURCE_EMAIL } from '../../utils/config.js'

AWS.config.update({ region: 'eu-north-1' })

/**
 * @param {Object} mail
 * @param {string} mail.email - Destination
 * @param {string} mail.subject
 * @param {string} mail.body
 * @param {boolean} [mail.html=false]
 * @param {string} [mail.sourceEmail=SOURCE_EMAIL] - Source
 */

function sendMail({ email, subject, body, html = false, sourceEmail = SOURCE_EMAIL }) {
  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {},
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: sourceEmail,
  }

  const messageBody = {
    Charset: 'UTF-8',
    Data: body,
  }

  html ? (params.Message.Body.Html = messageBody) : (params.Message.Body.Text = messageBody)

  if (process.env.NODE_ENV !== 'test') {
    const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise()

    return sendPromise
      .then((data) => {
        logger.info(`Message sent to ${email}`)
      })
      .catch((err) => {
        logger.error(err, err.stack)
        throw err
      })
  }

  return Promise.resolve()
}

function splitBase64Lines(input = '', lineLength = 76) {
  const value = String(input).replace(/\s+/g, '')
  const lines = []
  for (let i = 0; i < value.length; i += lineLength) {
    lines.push(value.slice(i, i + lineLength))
  }
  return lines.join('\n')
}

function normalizeBase64(input = '') {
  const source = String(input)
  if (source.includes(',')) {
    return source.split(',')[1]
  }
  return source
}

/**
 * @param {Object} mail
 * @param {string} mail.email
 * @param {string} mail.subject
 * @param {string} mail.body
 * @param {string} mail.pdfBase64
 * @param {string} [mail.fileName='receipt.pdf']
 * @param {string} [mail.sourceEmail=SOURCE_EMAIL]
 */
function sendMailWithAttachment({
  email,
  subject,
  body,
  pdfBase64,
  fileName = 'receipt.pdf',
  sourceEmail = SOURCE_EMAIL,
}) {
  const boundary = `NextPart_${Date.now()}`
  const normalizedPdfBase64 = splitBase64Lines(normalizeBase64(pdfBase64))

  const rawMessage = [
    `From: ${sourceEmail}`,
    `To: ${email}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${fileName}"`,
    'Content-Description: Receipt PDF',
    `Content-Disposition: attachment; filename="${fileName}";`,
    'Content-Transfer-Encoding: base64',
    '',
    normalizedPdfBase64,
    '',
    `--${boundary}--`,
  ].join('\n')

  if (process.env.NODE_ENV !== 'test') {
    return new AWS.SES({ apiVersion: '2010-12-01' })
      .sendRawEmail({
        RawMessage: {
          Data: rawMessage,
        },
      })
      .promise()
      .then(() => {
        logger.info(`Message with attachment sent to ${email}`)
      })
      .catch((err) => {
        logger.error(err, err.stack)
        throw err
      })
  }

  return Promise.resolve()
}

export { sendMailWithAttachment }

export default sendMail
