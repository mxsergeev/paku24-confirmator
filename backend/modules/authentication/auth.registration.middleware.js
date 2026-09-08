import crypto from 'crypto'
import bcrypt from 'bcrypt'
import passwordGenerator from 'generate-password'
import { uniqueNamesGenerator, colors, animals } from 'unique-names-generator'
import mongoose from 'mongoose'

import User from '../../models/user.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'

const MAX_USERNAME_ATTEMPTS = 5

function generateUsername() {
  return uniqueNamesGenerator({ dictionaries: [colors, animals] })
}

function isUsernameDuplicateKeyError(err) {
  return (
    err &&
    err.code === 11000 &&
    (Object.prototype.hasOwnProperty.call(err.keyPattern || {}, 'username') ||
      Object.prototype.hasOwnProperty.call(err.keyValue || {}, 'username'))
  )
}

async function persistWithUniqueUsername({ existingUsername, persist }) {
  if (existingUsername) {
    await persist(existingUsername)
    return existingUsername
  }

  for (let attempt = 0; attempt < MAX_USERNAME_ATTEMPTS; attempt += 1) {
    const username = generateUsername()

    try {
      await persist(username)
      return username
    } catch (err) {
      if (!isUsernameDuplicateKeyError(err) || attempt === MAX_USERNAME_ATTEMPTS - 1) {
        throw err
      }
    }
  }

  return undefined
}

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
      _id: mongoose.Types.ObjectId(),
      name,
      email,
      requestToken,
      access: false,
      accessRequested: Date.now(),
    })
    const username = await persistWithUniqueUsername({
      persist: (candidate) => {
        user.username = candidate
        return user.save()
      },
    })
    req.requestToken = requestToken
    req.username = username
    req.randomUsername = username

    return next()
  } catch (err) {
    return next(err)
  }
}

// checkUserToken
async function checkUser(req, res, next) {
  const requestToken = decodeURIComponent(req.query.token)

  const matchedUser = await User.findOne({ requestToken }).exec()
  req.matchedUser = matchedUser

  if (matchedUser) return next()

  const RequestTokenError = newErrorWithCustomName('RequestTokenError')
  return next(RequestTokenError)
}

async function generatePassword(req, res, next) {
  try {
    const generatedPassword = passwordGenerator.generate({
      length: 8,
      numbers: true,
    })
    const saltRounds = 10
    req.passwordHash = await bcrypt.hash(generatedPassword, saltRounds)
    req.generatedPassword = generatedPassword
    return next()
  } catch (err) {
    return next(err)
  }
}

async function updateUser(req, res, next) {
  const { matchedUser, passwordHash } = req

  try {
    const username = await persistWithUniqueUsername({
      existingUsername: matchedUser.username,
      persist: (candidate) =>
        matchedUser
          .updateOne({
            username: candidate,
            passwordHash,
            access: true,
            $unset: { requestToken: '', accessRequested: '' },
          })
          .exec(),
    })

    req.username = username
    req.randomUsername = username
    return next()
  } catch (err) {
    return next(err)
  }
}

export {
  checkIfUserExists,
  createUser,
  checkUser,
  generatePassword,
  updateUser,
}
