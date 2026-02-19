import crypto from 'crypto'
import bcrypt from 'bcrypt'
import passwordGenerator from 'generate-password'
import { uniqueNamesGenerator, colors, animals } from 'unique-names-generator'
import mongoose from 'mongoose'

import User from '../../models/user.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'

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

    const randomUsername = uniqueNamesGenerator({
      dictionaries: [colors, animals],
    })

    const user = new User({
      _id: mongoose.Types.ObjectId(),
      username: randomUsername,
      name,
      email,
      requestToken,
      access: false,
      accessRequested: Date.now(),
    })
    // eslint-disable-next-line no-console
    console.log('user', user)

    await user.save()
    req.requestToken = requestToken
    req.randomUsername = randomUsername

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
  const { matchedUser, randomUsername, passwordHash } = req

  try {
    await matchedUser
      .updateOne({
        username: randomUsername,
        passwordHash,
        access: true,
        $unset: { requestToken: '', accessRequested: '' },
      })
      .exec()
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
