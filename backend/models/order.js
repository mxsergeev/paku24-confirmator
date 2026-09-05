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
  id: { type: String, required: true },
  name: { type: String, required: true },
  pricePerHour: { type: Number, required: true },
  eventColor: String,
  hsy: Boolean,
  multiplier: Number,
})

const paymentTypeSchema = nestedSchema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  fee: { type: Number, required: true },
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
  deliveryDate: { type: Date, required: true },
  deliveryHasTime: { type: Boolean, required: true },
  returnDate: { type: Date, required: true },
  returnHasTime: { type: Boolean, required: true },
  amount: { type: Number, required: true },
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
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  service: { type: serviceSchema, required: true, default: undefined },
  paymentType: { type: paymentTypeSchema, required: true, default: undefined },
  address: { type: addressSchema, required: true, default: undefined },
  extraAddresses: { type: [addressSchema], required: true, default: [] },
  destination: { type: addressSchema, required: true, default: undefined },
  boxes: { type: boxesSchema, required: true, default: undefined },
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
    required: true,
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
