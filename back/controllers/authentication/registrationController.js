const registrationRouter = require('express').Router()

const sendMail = require('../../utils/email/awsSES')
const { DOMAIN_NAME } = require('../../utils/config')
const requestAccessMessage = require('../../utils/data/requestAccessMessage.json')
const accessGrantedMessage = require('../../utils/data/accessGrantedMessage.json')

const {
  checkIfUserExists,
  createUser,
  checkUser,
  generatePasswordAndUsername,
  updateUser,
} = require('../../utils/middleware/registration')

function generateMessage(template, variables) {
  let message = template
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replaceAll(`@${key}`, value)
  })

  return message
}

registrationRouter.post(
  '/request-access',
  checkIfUserExists,
  createUser,
  async (req, res, next) => {
    const { name, email, purpose } = req.body
    const { requestToken } = req
    const url = `${DOMAIN_NAME}/api/registration/grant-access/?token=${encodeURIComponent(
      requestToken
    )}`
    const messageBody = generateMessage(requestAccessMessage.template, {
      name,
      email,
      purpose,
      url,
    })

    try {
      await sendMail({
        email: 'themaximsergeev@gmail.com',
        subject: 'Request for access',
        body: messageBody,
        html: true,
        sourceEmail: 'paku24.confirmator@gmail.com',
      })
      return res.status(200).send({
        message:
          'Your request has been successfully sent! You will receive email with your credentials when your request has been approved.',
      })
    } catch (err) {
      return next(err)
    }
  }
)

registrationRouter.get(
  '/grant-access',
  checkUser,
  generatePasswordAndUsername,
  updateUser,
  async (req, res, next) => {
    const {
      randomUsername: username,
      generatedPassword: password,
      matchedUser,
    } = req
    const url = `${DOMAIN_NAME}/app/login`
    try {
      const messageBody = generateMessage(accessGrantedMessage.template, {
        username,
        password,
        url,
      })

      await sendMail({
        email: matchedUser.email,
        subject: 'Request for access approved',
        body: messageBody,
        html: true,
        sourceEmail: 'paku24.confirmator@gmail.com',
      })

      return res.status(200).send({ message: 'Access granted successfully.' })
    } catch (err) {
      return next(err)
    }
  }
)

module.exports = registrationRouter
