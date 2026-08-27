import distances from '../../data/distances.json' with { type: 'json' }
import fees from '../../data/fees.json' with { type: 'json' }
import paymentTypes from '../../data/paymentTypes.json' with { type: 'json' }
import services from '../../data/services.json' with { type: 'json' }

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
    returnDate: '2026-01-24T07:00:00.000Z',
    amount: 10,
    ...overrides,
  }
}

function makeBookingFields(overrides = {}) {
  const service = makeService()

  return {
    distance: distances.insideCapital,
    hsy: false,
    XL: false,
    eventColor: service.eventColor,
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

export function makeWordPressStructuredJsonComplete() {
  return {
    ...makeBookingFields(),
    fees: [makeFee('weekendFee')],
    boxesPrice: 52,
    price: 167,
  }
}

export function makeWordPressStructuredJsonMissingPricing() {
  return makeBookingFields({
    name: 'WordPress Customer Without Pricing',
    boxes: makeBoxes({ amount: 5 }),
  })
}

export const wordpressTextOrder = `Service: Pakettiauto ja kuljettaja
Accessories: None

Date and time: Thursday, January 15th 2026 09:00
Duration: 2 h

Start location: Helsinki / 00100 Mannerheimintie 10
End location: Helsinki / 00500 Paaskylankatu 5
Name: Test Customer
Email: customer@example.com
Phone: +358401234567
Comment: Ring the doorbell on arrival.

Payment Type: Maksukortti
PRICE
— Amount: 10
— Price: 52
— Booking time starts: 2026-01-16T09:00
— Booking time ends: 2026-01-24T09:00
— Self pickup: No
— Self return: No

--
Tämä viesti lähetettiin sivustolta Paku24.fi (https://paku24.fi)`

export function makeAppOrder() {
  return {
    ...makeBookingFields({
      date: '2026-06-15T06:00:00.000Z',
      boxes: makeBoxes({
        deliveryDate: '2026-06-16T06:00:00.000Z',
        returnDate: '2026-06-24T06:00:00.000Z',
        amount: 0,
      }),
      name: 'App Customer',
    }),
    origin: 'app',
    initialSnapshot: null,
    pricing: {
      source: {
        price: 'auto',
        fees: 'auto',
        boxesPrice: 'auto',
      },
      manual: {
        price: null,
        fees: null,
        boxesPrice: null,
      },
    },
    price: 100,
    fees: [],
    boxesPrice: 0,
  }
}

export function makeWordPressOrder() {
  const current = makeWordPressStructuredJsonComplete()

  return {
    ...current,
    origin: 'wordpress',
    initialSnapshot: makeWordPressStructuredJsonComplete(),
    pricing: {
      source: {
        price: 'initial',
        fees: 'initial',
        boxesPrice: 'initial',
      },
      manual: {
        price: null,
        fees: null,
        boxesPrice: null,
      },
    },
  }
}

export function makeDraftPayload() {
  const order = makeWordPressOrder()

  return {
    version: 1,
    order: {
      ...order,
      pricing: {
        source: {
          price: 'auto',
          fees: 'manual',
          boxesPrice: 'initial',
        },
        manual: {
          price: null,
          fees: [makeFee('nightFee')],
          boxesPrice: null,
        },
      },
      price: 172,
      fees: [makeFee('nightFee')],
      boxesPrice: 52,
    },
  }
}

export function makePersistedApiOrder() {
  return {
    ...makeWordPressOrder(),
    id: '66c000000000000000000001',
    _id: '66c000000000000000000001',
    confirmed: true,
    confirmedBy: '66c000000000000000000002',
    confirmedAt: '2026-01-10T12:00:00.000Z',
    receivedAt: '2026-01-10T11:30:00.000Z',
    canceledAt: null,
    deletedAt: null,
    markedForDeletion: false,
    invoiceNumber: '2026-001',
    googleEventId: 'fixture-google-event-id',
  }
}

export function makeCustomerCommunicationPayload() {
  return {
    ...makeBookingFields(),
    price: 167,
    fees: [makeFee('weekendFee')],
    boxesPrice: 52,
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

export function makeDateOnlyBoxes() {
  return {
    deliveryDate: '2026-03-12',
    returnDate: '2026-03-20',
    amount: 10,
  }
}
