/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  username: String,
  name: String,
  passwordHash: String,
  email: String,
  requestToken: String,
  access: Boolean,
  accessRequested: Number,
  // orders: [
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: 'RawOrder',
  //   },
  // ],
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  },
})

const User = mongoose.model('User', userSchema)

module.exports = User
