const crypto = require('crypto')
const bcrypt = require('bcrypt')
const passwordGenerator = require('generate-password')
const {
  uniqueNamesGenerator,
  colors,
  animals,
} = require('unique-names-generator')

const User = require('../../models/user')
const newErrorWithCustomName = require('../helpers/newErrorWithCustomName')

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

module.exports = {
  checkIfUserExists,
  createUser,
  checkUser,
  generatePasswordAndUsername,
  updateUser,
}
