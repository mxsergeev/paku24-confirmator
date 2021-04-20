const registrationRouter = require('express').Router()

const crypto = require('crypto')
const bcrypt = require('bcrypt')
const passwordGenerator = require('generate-password')
const {
  uniqueNamesGenerator,
  colors,
  animals,
} = require('unique-names-generator')

const User = require('../../models/user')
const sendMail = require('../../utils/email/awsSES')
const { DOMAIN_NAME } = require('../../utils/config')
const newErrorWithCustomName = require('../../utils/helpers/newErrorWithCustomName')
const requestAccessMessage = require('../../utils/data/requestAccessMessage.json')
const accessGrantedMessage = require('../../utils/data/accessGrantedMessage.json')

async function checkIfUserExists(req, res, next) {
  const { email } = req.body

  try {
    const userInDB = await User.findOne({ email }).exec()
    if (userInDB) {
      throw newErrorWithCustomName('AccessAlreadyRequestedError')
    }
    return next()
  } catch (err) {
    return next(err)
  }
}

async function createUser(req, res, next) {
  const { name, email } = req.body

  try {
    const requestToken = crypto
      .createHash('sha256')
      .update(Date.now().toString() + name)
      .digest('base64')

    const user = new User({
      name,
      email,
      requestToken,
      access: false,
    })

    await user.save()
    req.requestToken = requestToken

    return next()
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
      return res.status(200).send({
        message:
          'Your request has been successfully sent! You will receive email with your credentials when your request has been approved.',
      })
    } catch (err) {
      return next(err)
    }
  }
)

async function checkUser(req, res, next) {
  const requestToken = decodeURIComponent(req.query.token)

  const matchedUser = await User.findOne({ requestToken }).exec()
  req.matchedUser = matchedUser

  if (matchedUser) return next()

  const RequestTokenError = newErrorWithCustomName('RequestTokenError')
  return next(RequestTokenError)
}

async function generatePasswordAndUsername(req, res, next) {
  try {
    const generatedPassword = passwordGenerator.generate({
      length: 8,
      numbers: true,
    })
    const saltRounds = 10
    req.passwordHash = await bcrypt.hash(generatedPassword, saltRounds)
    req.generatedPassword = generatedPassword
    req.randomUsername = uniqueNamesGenerator({
      dictionaries: [colors, animals],
    })
    return next()
  } catch (err) {
    return next(err)
  }
}

async function updateUser(req, res, next) {
  const { matchedUser, randomUsername, passwordHash } = req

  try {
    await matchedUser
      .updateOne({
        username: randomUsername,
        passwordHash,
        access: true,
        $unset: { requestToken: '' },
      })
      .exec()
    return next()
  } catch (err) {
    return next(err)
  }
}

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
