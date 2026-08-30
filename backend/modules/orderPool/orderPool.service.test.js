import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  applyOrderPatch: vi.fn(),
  hydrateCanonicalOrder: vi.fn((order) => order),
  revertToInitial: vi.fn(),
}))

vi.mock('../../models/order.js', () => ({
  default: {
    findById: mocks.findById,
  },
}))

vi.mock('../../../src/shared/orderModel.js', () => ({
  BOOKING_FIELDS: ['name'],
  applyOrderPatch: mocks.applyOrderPatch,
  hydrateCanonicalOrder: mocks.hydrateCanonicalOrder,
  revertToInitial: mocks.revertToInitial,
}))

const { revertOrder, updateOrder } = await import('./orderPool.service.js')

function makeOrder() {
  return {
    toObject: () => ({ name: 'Existing order' }),
    save: vi.fn(),
  }
}

describe('order pool service error handling', () => {
  it('propagates unexpected update errors without converting them to validation errors', async () => {
    const order = makeOrder()
    const failure = new TypeError('programmer failure')
    mocks.findById.mockResolvedValue(order)
    mocks.applyOrderPatch.mockImplementation(() => {
      throw failure
    })

    await expect(updateOrder('66c000000000000000000001', { name: 'Updated' })).rejects.toBe(failure)
    expect(order.save).not.toHaveBeenCalled()
  })

  it('propagates unexpected revert errors without converting them to validation errors', async () => {
    const order = makeOrder()
    const failure = new TypeError('programmer failure')
    mocks.findById.mockResolvedValue(order)
    mocks.revertToInitial.mockImplementation(() => {
      throw failure
    })

    await expect(revertOrder('66c000000000000000000001')).rejects.toBe(failure)
    expect(order.save).not.toHaveBeenCalled()
  })
})
