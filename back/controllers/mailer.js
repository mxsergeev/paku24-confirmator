const nodemailer = require('nodemailer')

const { EMAIL, EMAIL_PASSWORD } = require('../utils/config')

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL,
    pass: EMAIL_PASSWORD,
  },
  secure: true,
})

function sendMail(email, subject, text) {
  const mailDetails = {
    from: EMAIL,
    to: email,
    subject,
    text,
  }

  mailTransporter.sendMail(mailDetails, (err, data) => {
    if (err) {
      console.log('Error Occurs', err)
    } else {
      console.log('Email sent successfully', data.envelope)
    }
  })
}

module.exports = sendMail
