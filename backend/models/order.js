import mongoose from 'mongoose'
import * as logger from '../utils/logger.js'
import { syncOrderToCalendar, deleteOrderEvent } from '../modules/calendar/calendar.sync.js'

const addressSchema = new mongoose.Schema(
  {
    street: String,
    index: String,
    city: String,
    floor: Number,
    elevator: Boolean,
  },
  { _id: false }
)

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
      _id: false,
      name: String,
      amount: Number,
      comment: String,
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
  boxesPrice: Number,
  eventColor: String,
  boxes: {
    deliveryDate: Date,
    returnDate: Date,
    amount: Number,
    pricePerBox: Number,
    deliveryPrice: Number,
    returnPrice: Number,
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
  invoiceNumber: {
    type: String,
    default: null,
  },
  canceledAt: Date,
  googleEventId: {
    type: String,
    default: null,
  },
})

order.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

// Synchronize with Google Calendar for confirmed orders
order.post('save', function (doc) {
  try {
    // Only sync if order is confirmed and not deleted
    if (doc && doc.confirmed && !doc.deletedAt) {
      setImmediate(() => {
        syncOrderToCalendar(doc).catch((err) => logger.error('syncOrderToCalendar error', err))
      })
    }
  } catch (err) {
    logger.error('post save hook error', err)
  }
})

order.post('findOneAndUpdate', function (doc) {
  try {
    if (doc) {
      // If the document was marked as deleted (soft delete), remove the Google event
      if (doc.deletedAt && doc.googleEventId) {
        setImmediate(() => {
          deleteOrderEvent(doc).catch((err) => logger.error('deleteOrderEvent error', err))
        })
        return
      }

      // Otherwise, only sync on update if order is confirmed and not deleted
      if (doc.confirmed && !doc.deletedAt) {
        setImmediate(() => {
          syncOrderToCalendar(doc).catch((err) => logger.error('syncOrderToCalendar error', err))
        })
      }
    }
  } catch (err) {
    logger.error('post findOneAndUpdate hook error', err)
  }
})

order.post('findOneAndDelete', function (doc) {
  try {
    if (doc && doc.googleEventId) {
      setImmediate(() => {
        deleteOrderEvent(doc).catch((err) => logger.error('deleteOrderEvent error', err))
      })
    }
  } catch (err) {
    logger.error('post findOneAndDelete hook error', err)
  }
})

const Order = mongoose.model('Order', order)

export default Order
