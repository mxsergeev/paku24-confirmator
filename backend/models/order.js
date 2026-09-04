import mongoose from 'mongoose'

function nestedSchema(definition, options = {}) {
  return new mongoose.Schema(definition, {
    _id: false,
    id: false,
    ...options,
  })
}

const addressSchema = nestedSchema({
  street: String,
  index: String,
  city: String,
  floor: Number,
  elevator: Boolean,
})

const serviceSchema = nestedSchema({
  id: String,
  name: String,
  pricePerHour: Number,
  eventColor: String,
  hsy: Boolean,
  multiplier: Number,
})

const paymentTypeSchema = nestedSchema({
  id: String,
  name: String,
  fee: Number,
  additionalFieldLabel: String,
  additionalFieldValue: String,
})

const feeSchema = nestedSchema({
  name: String,
  label: String,
  amount: Number,
  comment: String,
  baseFee: Number,
  startFloor: Number,
})

const boxesSchema = nestedSchema({
  deliveryDate: Date,
  deliveryHasTime: Boolean,
  returnDate: Date,
  returnHasTime: Boolean,
  amount: Number,
})

const pricingOverridesSchema = nestedSchema({
  price: { type: Number, default: null },
  fees: { type: [feeSchema], default: null },
  boxesPrice: { type: Number, default: null },
})

const order = new mongoose.Schema({
  distance: String,
  hsy: Boolean,
  eventColor: String,
  date: Date,
  duration: Number,
  service: { type: serviceSchema, default: undefined },
  paymentType: { type: paymentTypeSchema, default: undefined },
  address: { type: addressSchema, default: undefined },
  extraAddresses: { type: [addressSchema], default: [] },
  destination: { type: addressSchema, default: undefined },
  boxes: { type: boxesSchema, default: undefined },
  name: String,
  email: String,
  phone: String,
  comment: String,
  originalOrder: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    immutable: true,
  },
  pricingOverrides: {
    type: pricingOverridesSchema,
    default: () => ({}),
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
  calendarEventIds: {
    type: nestedSchema({
      main: { type: String, default: null },
      boxDelivery: { type: String, default: null },
      boxReturn: { type: String, default: null },
    }),
    default: () => ({ main: null, boxDelivery: null, boxReturn: null }),
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

export default Order
