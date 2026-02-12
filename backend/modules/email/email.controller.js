const emailRouter = require('express').Router()
const sendMail = require('./email.awsAPI')
const { makeTerms } = require('./email.helpers')
const authMW = require('../authentication/auth.middleware')

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

module.exports = emailRouter
