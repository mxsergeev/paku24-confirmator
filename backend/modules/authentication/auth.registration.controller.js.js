import express from 'express'

const registrationRouter = express.Router()

import ms from 'ms'

import User from '../../models/user.js'
import sendMail from '../email/email.awsAPI.js'
import requestAccessMessage from './auth.registration.data.requestAccessMessage.json' with { type: 'json' }
import accessGrantedMessage from './auth.registration.data.accessGrantedMessage.json' with { type: 'json' }
import { DOMAIN_NAME, ACCESS_REQUESTED_EXPIRES_IN_DAYS } from '../../utils/config.js'

import {
  checkIfUserExists,
  createUser,
  checkUser,
  generatePassword,
  updateUser,
} from './auth.registration.middleware.js'

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
  generatePassword,
  updateUser,
  async (req, res, next) => {
    const { generatedPassword: password, matchedUser } = req
    const username = (matchedUser && matchedUser.username) || req.randomUsername
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

export default registrationRouter
