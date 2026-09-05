import distances from '../../data/distances.json' with { type: 'json' }
import fees from '../../data/fees.json' with { type: 'json' }
import paymentTypes from '../../data/paymentTypes.json' with { type: 'json' }
import services from '../../data/services.json' with { type: 'json' }
import { createAppOrder } from '../orderModel.js'
import { normalizeWordPressOrderPayload } from '../wordpressOrderPayload.js'

const START_ADDRESS = {
  street: 'Mannerheimintie 10',
  index: '00100',
  city: 'Helsinki',
  floor: 3,
  elevator: true,
}

const EXTRA_ADDRESS = {
  street: 'Mechelininkatu 20',
  index: '00100',
  city: 'Helsinki',
  floor: 1,
  elevator: false,
}

const DESTINATION_ADDRESS = {
  street: 'Paaskylankatu 5',
  index: '00500',
  city: 'Helsinki',
  floor: 4,
  elevator: false,
}

const SERVICE_ID = '1'
const PAYMENT_TYPE_ID = '1'

function findById(items, id) {
  return items.find((item) => String(item.id) === String(id))
}

function makeFee(name) {
  return { ...fees.find((fee) => fee.name === name) }
}

function makeAddress(address) {
  return { ...address }
}

function makeService() {
  return { ...findById(services, SERVICE_ID) }
}

function makePaymentType() {
  const paymentType = findById(paymentTypes, PAYMENT_TYPE_ID)

  return {
    ...paymentType,
    fee: Number(paymentType.fee) || 0,
  }
}

function makeBoxes(overrides = {}) {
  return {
    deliveryDate: '2026-01-16T07:00:00.000Z',
    deliveryHasTime: true,
    returnDate: '2026-01-24T07:00:00.000Z',
    returnHasTime: true,
    amount: 10,
    ...overrides,
  }
}

function makeBooking(overrides = {}) {
  const service = makeService()

  return {
    date: '2026-01-15T07:00:00.000Z',
    duration: 2,
    service,
    paymentType: makePaymentType(),
    address: makeAddress(START_ADDRESS),
    extraAddresses: [makeAddress(EXTRA_ADDRESS)],
    destination: makeAddress(DESTINATION_ADDRESS),
    boxes: makeBoxes(),
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '+358401234567',
    comment: 'Ring the doorbell on arrival.',
    ...overrides,
  }
}

export function makeWordPressPayload(overrides = {}) {
  return {
    ...makeBooking(),
    fees: [makeFee('weekendFee')],
    boxesPrice: 52,
    price: 167,
    ...overrides,
  }
}

export function makeWordPressPayloadMissingPricing(overrides = {}) {
  const payload = makeWordPressPayload({
    name: 'WordPress Customer Without Pricing',
    boxes: makeBoxes({ amount: 5 }),
    ...overrides,
  })

  if (!Object.prototype.hasOwnProperty.call(overrides, 'fees')) delete payload.fees
  if (!Object.prototype.hasOwnProperty.call(overrides, 'boxesPrice')) delete payload.boxesPrice
  if (!Object.prototype.hasOwnProperty.call(overrides, 'price')) delete payload.price

  return payload
}

export function makeAppBooking(overrides = {}) {
  return {
    ...makeBooking({
      date: '2026-06-15T06:00:00.000Z',
      boxes: makeBoxes({
        deliveryDate: '2026-06-16T06:00:00.000Z',
        deliveryHasTime: true,
        returnDate: '2026-06-24T06:00:00.000Z',
        returnHasTime: true,
        amount: 0,
      }),
      name: 'App Customer',
    }),
    distance: distances.insideCapital,
    hsy: false,
    eventColor: '1',
    ...overrides,
  }
}

export function makeCanonicalWordPressOrder(overrides = {}) {
  const source = makeWordPressPayload(overrides)
  return {
    ...normalizeWordPressOrderPayload(source),
    originalOrder: structuredClone(source),
  }
}

export function makeCanonicalAppOrder(overrides = {}) {
  return createAppOrder(makeAppBooking(overrides))
}

export function makeCustomerCommunicationPayload() {
  return {
    ...makeWordPressPayload(),
    distance: distances.insideCapital,
    hsy: false,
    eventColor: '1',
  }
}

export const helsinkiWinterDatetime = {
  wallClock: '2026-01-15T09:00:00',
  instant: '2026-01-15T07:00:00.000Z',
  offset: '+02:00',
}

export const helsinkiSummerDatetime = {
  wallClock: '2026-06-15T09:00:00',
  instant: '2026-06-15T06:00:00.000Z',
  offset: '+03:00',
}

export const helsinkiDstTransitions = {
  springForward: {
    before: {
      local: '2026-03-29T02:59:59+02:00',
      instant: '2026-03-29T00:59:59.000Z',
    },
    after: {
      local: '2026-03-29T04:00:00+03:00',
      instant: '2026-03-29T01:00:00.000Z',
    },
  },
  fallBack: {
    before: {
      local: '2026-10-25T03:59:59+03:00',
      instant: '2026-10-25T00:59:59.000Z',
    },
    after: {
      local: '2026-10-25T03:00:00+02:00',
      instant: '2026-10-25T01:00:00.000Z',
    },
  },
}
