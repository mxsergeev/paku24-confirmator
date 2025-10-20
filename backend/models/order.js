const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
  id: String,
  street: String,
  index: String,
  city: String,
  floor: Number,
  elevator: Boolean,
})

const order = new mongoose.Schema({
  date: Date,
  duration: Number,
  service: {
    id: String,
    name: String,
    pricePerHour: Number,
    price: Number,
  },
  paymentType: {
    id: String,
    name: String,
    fee: Number,
    // Arbitrary fields are also possible:
    [String]: String,
  },
  fees: [
    {
      id: String,
      name: String,
      amount: Number,
    },
  ],
  address: addressSchema,
  destination: addressSchema,
  extraAddresses: [addressSchema],
  name: String,
  email: String,
  phone: String,
  comment: String,
  price: Number,
  boxes: {
    deliveryDate: Date,
    returnDate: Date,
    amount: Number,
  },
  markedForDeletion: {
    type: Boolean,
    default: false,
  },
  confirmed: {
    type: Boolean,
    default: false,
  },
  receivedAt: Date,
  confirmedAt: Date,
  deletedAt: Date,
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
})

order.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

const Order = mongoose.model('Order', order)

module.exports = Order
