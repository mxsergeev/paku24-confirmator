const emailRouter = require('express').Router()

const sendMail = require('./mailer')

emailRouter.post('/', (req, res) => {
  const {
    email, confirmation, terms,
  } = req.body

  const subject = 'VARAUSVAHVISTUS'

  sendMail(email, subject, `${confirmation}\n\n${terms}`)

  res.status(200).send('Email sent successfully')
})

module.exports = emailRouter
