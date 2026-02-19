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
      })
  }

  return Promise.resolve()
}

export default sendMail
