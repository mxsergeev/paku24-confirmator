import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  deleteOne: vi.fn(),
  deleteOrderEvent: vi.fn(),
  applyOrderPatch: vi.fn(),
  hydrateCanonicalOrder: vi.fn((order) => order),
  revertToInitial: vi.fn(),
}))

vi.mock('../../models/order.js', () => ({
  default: {
    findById: mocks.findById,
    deleteOne: mocks.deleteOne,
  },
}))

vi.mock('../calendar/calendar.sync.js', () => ({
  deleteOrderEvent: mocks.deleteOrderEvent,
}))

vi.mock('../../../src/shared/orderModel.js', () => ({
  BOOKING_FIELDS: ['name'],
  applyOrderPatch: mocks.applyOrderPatch,
  hydrateCanonicalOrder: mocks.hydrateCanonicalOrder,
  revertToInitial: mocks.revertToInitial,
}))

const { deleteOrderPermanently, revertOrder, updateOrder } = await import('./orderPool.service.js')

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

describe('permanent order deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteOrderEvent.mockResolvedValue(true)
    mocks.deleteOne.mockResolvedValue({ deletedCount: 1 })
  })

  it('deletes calendar state before removing the database row', async () => {
    const order = makeOrder()
    mocks.findById.mockResolvedValue(order)

    await expect(deleteOrderPermanently('66c000000000000000000001')).resolves.toBe(order)

    expect(mocks.deleteOrderEvent).toHaveBeenCalledWith(order)
    expect(mocks.deleteOne).toHaveBeenCalledWith({ _id: '66c000000000000000000001' })
    expect(mocks.deleteOrderEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteOne.mock.invocationCallOrder[0],
    )
  })

  it('does not remove the database row when calendar deletion fails', async () => {
    const order = makeOrder()
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.deleteOrderEvent.mockRejectedValue(failure)

    await expect(deleteOrderPermanently('66c000000000000000000001')).rejects.toBe(failure)
    expect(mocks.deleteOne).not.toHaveBeenCalled()
  })
})
