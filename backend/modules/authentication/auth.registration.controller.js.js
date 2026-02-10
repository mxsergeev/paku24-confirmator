const registrationRouter = require('express').Router()
const ms = require('ms')

const User = require('../../models/user')
const sendMail = require('../email/email.awsAPI')
const requestAccessMessage = require('./auth.registration.data.requestAccessMessage.json')
const accessGrantedMessage = require('./auth.registration.data.accessGrantedMessage.json')
const { DOMAIN_NAME, ACCESS_REQUESTED_EXPIRES_IN_DAYS } = require('../../utils/config')

const {
  checkIfUserExists,
  createUser,
  checkUser,
  generatePasswordAndUsername,
  updateUser,
} = require('./auth.registration.middleware')

async function deleteUsersWithExpiredAccessRequest(next) {
  try {
    return User.deleteMany({
      accessRequested: {
        $lt: Date.now() - ms(ACCESS_REQUESTED_EXPIRES_IN_DAYS),
      },
    })
  } catch (err) {
    return next(err)
  }
}

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
      res.status(200).send({
        message:
          'Your request has been successfully sent! You will receive email with your credentials when your request has been approved.',
      })
      return deleteUsersWithExpiredAccessRequest(req, res, next)
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
    const { randomUsername: username, generatedPassword: password, matchedUser } = req
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
