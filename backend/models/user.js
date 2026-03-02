/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
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
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  },
})

const User = mongoose.model('User', userSchema)

export default User
