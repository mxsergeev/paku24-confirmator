const mongoose = require('mongoose')

const rawOrderSchema = new mongoose.Schema({
  text: String,
  date: {
    type: Date,
    default: new Date(),
  },
  markedForDeletion: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: String,
    required: false,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  confirmedAt: Date,
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
