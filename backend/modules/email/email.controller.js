const emailRouter = require('express').Router()
const sendMail = require('./email.awsAPI')
const { makeTerms } = require('./email.helpers')
const authMW = require('../authentication/auth.middleware')

emailRouter.use(authMW.authenticateAccessToken)

emailRouter.post('/send-confirmation', (req, res, next) => {
  const { orderDetails, order } = req.body
  const terms = makeTerms(order)
  const subject = 'VARAUSVAHVISTUS'
  const body = `VARAUSVAHVISTUS\n${orderDetails}\nKIITOS VARAUKSESTANNE!\n\n${terms}`

  sendMail({
    email: order.email,
    subject,
    body,
  })
    .then(() => res.status(200).send({ message: `Email sent to ${order.email}.` }))
    .catch((err) => next(err))
})

module.exports = emailRouter
