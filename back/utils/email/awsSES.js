const AWS = require('aws-sdk')

// const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = require('../utils/config')

AWS.config.update({ region: 'eu-north-1' })

function sendMail({
  email,
  subject,
  body,
  confirmation,
  sourceEmail = 'varaukset@paku24.fi',
}) {
  let params = {
    Destination: {
      /* required */
      // CcAddresses: [
      //   /* more items */
      // ],
      ToAddresses: [
        email,
        /* more items */
      ],
    },
    Message: {
      /* required */
      Body: {
        /* required */
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: sourceEmail /* required */,
    // ReplyToAddresses: [
    //   'EMAIL_ADDRESS',
    //   /* more items */
    // ],
  }

  const opt = {
    Charset: 'UTF-8',
    Data: body,
  }

  confirmation
    ? (params.Message.Body.Text = opt)
    : (params.Message.Body.Html = opt)

  const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' })
    .sendEmail(params)
    .promise()

  sendPromise
    .then((data) => {
      console.log(data)
    })
    .catch((err) => {
      console.error(err, err.stack)
    })
}

module.exports = sendMail
