import distances from '../data/distances.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }

function makeAddress() {
  return {
    street: '',
    index: '',
    city: '',
    floor: 0,
    elevator: false,
  }
}

function makeBoxes(now = new Date()) {
  return {
    deliveryDate: new Date(now.getTime()),
    deliveryHasTime: true,
    returnDate: new Date(now.getTime()),
    returnHasTime: true,
    amount: 0,
  }
}

function makePricingOverrides() {
  return {
    price: null,
    fees: null,
    boxesPrice: null,
  }
}

function createAppOrder(overrides = {}) {
  const now = new Date()
  const service = { ...(services[0] || {}) }
  const paymentType = {
    ...(paymentTypes[0] || {}),
    fee: Number(paymentTypes[0]?.fee) || 0,
  }
  const defaults = {
    distance: distances.insideCapital,
    hsy: false,
    eventColor: null,
    date: new Date(now.getTime()),
    duration: 1,
    service,
    paymentType,
    address: makeAddress(),
    extraAddresses: [],
    destination: makeAddress(),
    boxes: makeBoxes(now),
    name: '',
    email: '',
    phone: '',
    comment: '',
    pricingOverrides: makePricingOverrides(),
  }

  return {
    ...defaults,
    ...overrides,
    service: overrides.service || service,
    paymentType: overrides.paymentType || paymentType,
    address: overrides.address || defaults.address,
    extraAddresses: overrides.extraAddresses || defaults.extraAddresses,
    destination: overrides.destination || defaults.destination,
    boxes: overrides.boxes ? { ...defaults.boxes, ...overrides.boxes } : defaults.boxes,
    pricingOverrides: overrides.pricingOverrides
      ? { ...defaults.pricingOverrides, ...overrides.pricingOverrides }
      : defaults.pricingOverrides,
  }
}

function updateOrderField(order, key, value) {
  return {
    ...order,
    [key]: value,
  }
}

export { createAppOrder, updateOrderField }
