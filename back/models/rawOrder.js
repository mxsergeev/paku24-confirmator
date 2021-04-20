const mongoose = require('mongoose')

const rawOrderSchema = new mongoose.Schema({
  text: String,
  date: Number,
  confirmed: Boolean,
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
