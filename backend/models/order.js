import mongoose from 'mongoose'
import { isDateOnly, parseCalendarDate, parseInstant } from '../../src/shared/date-fns-tz.js'
import { hasLegacyPricing, resolvePricingOverrides } from '../../src/shared/orderPricing.js'

/**
 * A box date is either a calendar date (which must remain a string) or an
 * absolute instant (which is persisted as a Date). A regular Mongoose Date
 * path cannot represent both because it casts date-only strings to midnight.
 */
class DateOrDateOnly extends mongoose.SchemaType {
  constructor(key, options) {
    super(key, options, 'DateOrDateOnly')
  }

  cast(value) {
    if (value === null || value === undefined) return value

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new mongoose.Error.CastError(this.instance, value, this.path)
      }
      return value
    }

    if (typeof value === 'string') {
      if (isDateOnly(value)) {
        try {
          parseCalendarDate(value, this.path)
        } catch {
          throw new mongoose.Error.CastError(this.instance, value, this.path)
        }
        return value
      }

      try {
        return parseInstant(value, this.path)
      } catch {
        throw new mongoose.Error.CastError(this.instance, value, this.path)
      }
    }

    throw new mongoose.Error.CastError(this.instance, value, this.path)
  }
}

// SchemaType does not provide conditional handlers by default. Keep query
// casting on this type so ISO instants become Dates while calendar dates stay
// date-only strings, just as they do when assigning a document value.
function castDateOrDateOnly(value) {
  return this.cast(value)
}

function castDateOrDateOnlyArray(value) {
  const values = Array.isArray(value) ? value : [value]
  return values.map((item) => this.cast(item))
}

DateOrDateOnly.prototype.$conditionalHandlers = {
  $eq: castDateOrDateOnly,
  $ne: castDateOrDateOnly,
  $gt: castDateOrDateOnly,
  $gte: castDateOrDateOnly,
  $lt: castDateOrDateOnly,
  $lte: castDateOrDateOnly,
  $in: castDateOrDateOnlyArray,
  $nin: castDateOrDateOnlyArray,
}

DateOrDateOnly.schemaName = 'DateOrDateOnly'
mongoose.Schema.Types.DateOrDateOnly = DateOrDateOnly

function finiteNumberPath(options = {}) {
  return {
    type: Number,
    ...options,
    validate: {
      validator: (value) => value === null || value === undefined || Number.isFinite(value),
      message: (props) => `${props.path} must be a finite number`,
    },
  }
}

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
  floor: finiteNumberPath(),
  elevator: Boolean,
})

// WordPress can provide service metadata that is not part of the local
// catalog. Keep the embedded source object intact, just as paymentType does,
// so normalization and persistence expose the same contract.
const serviceSchema = nestedSchema(
  {
    id: String,
    name: String,
    pricePerHour: finiteNumberPath(),
    price: finiteNumberPath(),
    eventColor: String,
    hsy: Boolean,
    multiplier: finiteNumberPath(),
  },
  { strict: false },
)

const paymentTypeSchema = nestedSchema(
  {
    id: String,
    name: String,
    fee: finiteNumberPath(),
    additionalFieldLabel: String,
    additionalFieldValue: String,
  },
  { strict: false },
)

const feeSchema = nestedSchema({
  name: String,
  label: String,
  amount: finiteNumberPath(),
  comment: String,
  baseFee: finiteNumberPath(),
  startFloor: finiteNumberPath(),
})

const boxesSchema = nestedSchema({
  deliveryDate: { type: DateOrDateOnly },
  returnDate: { type: DateOrDateOnly },
  amount: finiteNumberPath(),
  pricePerBox: finiteNumberPath(),
  deliveryPrice: finiteNumberPath(),
  returnPrice: finiteNumberPath(),
})

const pricingOverridesSchema = nestedSchema({
  price: finiteNumberPath({ default: null }),
  fees: { type: [feeSchema], default: null },
  boxesPrice: finiteNumberPath({ default: null }),
})

const order = new mongoose.Schema({
  // Editable booking data
  distance: String,
  hsy: Boolean,
  eventColor: String,
  date: Date,
  duration: finiteNumberPath(),
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

  // Immutable source data retained for WordPress imports.
  originalOrder: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    immutable: true,
  },

  // Null means that the automatic value is used.
  pricingOverrides: {
    type: pricingOverridesSchema,
    default: () => ({}),
  },

  // Lifecycle metadata
  confirmed: {
    type: Boolean,
    default: false,
  },
  receivedAt: Date,
  confirmedAt: Date,
  // An active order has no deletion timestamp. Treat an explicit null as
  // missing so canonical creation state does not materialize a null field in
  // MongoDB, while real deletion timestamps remain ordinary Dates.
  deletedAt: {
    type: Date,
    set: (value) => (value === null ? undefined : value),
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  invoiceNumber: {
    type: String,
    default: null,
  },
  canceledAt: Date,
  // Legacy main-event link retained long enough for calendar sync to migrate
  // orders created before role-specific calendarEventIds were introduced.
  googleEventId: {
    type: String,
    default: undefined,
  },
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
    if (hasLegacyPricing(returnedObject)) {
      returnedObject.pricingOverrides = resolvePricingOverrides(document || returnedObject)
      delete returnedObject.price
      delete returnedObject.fees
      delete returnedObject.boxesPrice
    }
    delete returnedObject.googleEventId
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

const Order = mongoose.model('Order', order)

export default Order
