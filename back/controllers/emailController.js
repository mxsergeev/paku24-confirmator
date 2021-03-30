const emailRouter = require('express').Router()
const sendMail = require('../utils/email/awsSES')
const { makeTerms } = require('../utils/email/helpers')
const {
  authenticateAccessToken,
} = require('../utils/middleware/authentication')

emailRouter.use(authenticateAccessToken)

emailRouter.post('/send-confirmation', (req, res, next) => {
  const { email, orderDetails, options } = req.body
  const subject = 'VARAUSVAHVISTUS'
  const terms = makeTerms(options)
  const body = `VARAUSVAHVISTUS\n${orderDetails}\nKIITOS VARAUKSESTANNE!\n\n${terms}`

  sendMail({
    email,
    subject,
    body,
  })
    .then(() => res.status(200).send({ message: 'Email sent successfully' }))
    .catch((err) => next(err))
})

module.exports = emailRouter
