const mongoose = require('mongoose')

const rawOrderSchema = new mongoose.Schema({
  text: String,
  date: {
    type: Number,
    default: Date.now,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  markedForDeletion: {
    type: Boolean,
    default: false,
  },
})

rawOrderSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

const RawOrder = mongoose.model('RawOrder', rawOrderSchema)

module.exports = RawOrder
