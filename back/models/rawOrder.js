const mongoose = require('mongoose')

const rawOrderSchema = new mongoose.Schema({
  text: String,
  date: {
    type: String,
    default: new Date().toISOString,
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
  confirmedAt: String,
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
