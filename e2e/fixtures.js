import { test as base, expect } from '@playwright/test'
import { connectToDatabase, disconnectFromDatabase } from '../backend/utils/database.js'
import Order from '../backend/models/order.js'
import { createAppOrder } from '../src/shared/orderModel.js'

const DEFAULT_ORDER = {
  date: '2026-01-15T10:00:00.000Z',
  duration: 2,
  name: 'E2E Customer',
  email: 'customer@example.com',
  phone: '+358401234567',
  address: {
    street: 'Test Street 1',
    index: '00100',
    city: 'Helsinki',
    floor: 1,
    elevator: true,
  },
  destination: {
    street: 'Destination Street 2',
    index: '00200',
    city: 'Espoo',
    floor: 2,
    elevator: false,
  },
}

function getDatabaseURI() {
  if (!process.env.TEST_MONGODB_URI) {
    throw new Error('TEST_MONGODB_URI is required for Playwright E2E tests')
  }
  return process.env.TEST_MONGODB_URI
}

async function withDatabase(callback) {
  await connectToDatabase({ uri: getDatabaseURI(), autoIndex: false })
  try {
    return await callback()
  } finally {
    await disconnectFromDatabase()
  }
}

export async function resetOrders() {
  return withDatabase(() => Order.deleteMany({}))
}

export async function seedOrder(overrides = {}) {
  const input = { ...DEFAULT_ORDER, ...overrides }
  const explicitSparseFields = [
    'address',
    'destination',
    'email',
    'extraAddresses',
    'boxes',
    'paymentType',
    'phone',
    'pricingOverrides',
    'service',
  ]
  const appOrderInput = { ...input }
  for (const field of explicitSparseFields) {
    if (appOrderInput[field] === null || appOrderInput[field] === undefined) {
      delete appOrderInput[field]
    }
  }
  if (
    Array.isArray(appOrderInput.extraAddresses) &&
    appOrderInput.extraAddresses.some(
      (address) =>
        !address ||
        ['street', 'index', 'city', 'floor', 'elevator'].some(
          (field) => address[field] === null || address[field] === undefined,
        ),
    )
  ) {
    delete appOrderInput.extraAddresses
  }
  if (
    appOrderInput.service &&
    ['id', 'name', 'pricePerHour'].some(
      (field) => appOrderInput.service[field] === null || appOrderInput.service[field] === undefined,
    )
  ) {
    delete appOrderInput.service
  }
  if (
    appOrderInput.paymentType &&
    ['id', 'name'].some(
      (field) =>
        appOrderInput.paymentType[field] === null || appOrderInput.paymentType[field] === undefined,
    )
  ) {
    delete appOrderInput.paymentType
  }
  if (
    appOrderInput.boxes &&
    ['deliveryDate', 'returnDate', 'amount'].some((field) => appOrderInput.boxes[field] == null)
  ) {
    delete appOrderInput.boxes
  }
  const appOrder = createAppOrder(appOrderInput)
  const lifecycleFields = [
    'canceledAt',
    'confirmed',
    'confirmedAt',
    'confirmedBy',
    'deletedAt',
    'invoiceNumber',
    'receivedAt',
  ]
  const explicitOverrides = Object.fromEntries(
    [...explicitSparseFields, ...lifecycleFields]
      .filter((field) => Object.prototype.hasOwnProperty.call(overrides, field))
      .map((field) => [field, overrides[field]]),
  )

  return withDatabase(async () => {
    const order = await new Order({
      ...appOrder,
      ...explicitOverrides,
    }).save()
    return order.toJSON()
  })
}

export async function readOrder(id) {
  return withDatabase(async () => {
    const order = await Order.findById(id)
    return order?.toJSON() || null
  })
}

export const test = base.extend({
  database: [
    async ({}, use) => {
      await resetOrders()
      await use({ seedOrder, readOrder })
    },
    { auto: true },
  ],
})

export { expect }
