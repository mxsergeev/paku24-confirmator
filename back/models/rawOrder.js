const mongoose = require('mongoose')

const rawOrderSchema = new mongoose.Schema({
  text: String,
  date: {
    type: Number,
    default: Date.now,
  },
  markedForDeletion: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: String,
    required: true,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  confirmedByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  confirmedAt: Number,
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
