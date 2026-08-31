import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
  deleteOrderEvent: vi.fn(),
  syncOrderToCalendar: vi.fn(),
  withOrderCalendarLock: vi.fn((_order, operation) => operation()),
  applyOrderPatch: vi.fn(),
  hydrateCanonicalOrder: vi.fn((order) => order),
  revertToInitial: vi.fn(),
}))

vi.mock('../../models/order.js', () => ({
  default: {
    findById: mocks.findById,
    findByIdAndUpdate: mocks.findByIdAndUpdate,
    findOneAndUpdate: mocks.findOneAndUpdate,
    deleteOne: mocks.deleteOne,
  },
}))

vi.mock('../calendar/calendar.sync.js', () => ({
  deleteOrderEvent: mocks.deleteOrderEvent,
  syncOrderToCalendar: mocks.syncOrderToCalendar,
  withOrderCalendarLock: mocks.withOrderCalendarLock,
}))

vi.mock('../../../src/shared/orderModel.js', () => ({
  BOOKING_FIELDS: ['name'],
  applyOrderPatch: mocks.applyOrderPatch,
  hydrateCanonicalOrder: mocks.hydrateCanonicalOrder,
  revertToInitial: mocks.revertToInitial,
}))

const {
  deleteOrderPermanently,
  revertOrder,
  updateOrder,
  confirmOrder,
  cancelOrder,
  updateOrderColor,
  deleteOrder,
} = await import('./orderPool.service.js')

function makeOrder() {
  return {
    confirmed: false,
    deletedAt: null,
    calendarEventIds: { main: null, boxDelivery: null, boxReturn: null },
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

    expect(mocks.deleteOrderEvent).toHaveBeenCalledWith(order, { lock: false, clearStoredIds: true })
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

  it('can retry row deletion after calendar cleanup partially succeeds', async () => {
    const order = makeOrder()
    const failure = new Error('one calendar role failed')
    order.calendarEventIds = {
      main: 'main-remaining',
      boxDelivery: null,
      boxReturn: null,
    }
    mocks.findById.mockResolvedValue(order)
    mocks.deleteOrderEvent
      .mockImplementationOnce(async () => {
        order.calendarEventIds.main = null
        throw failure
      })
      .mockResolvedValueOnce(true)

    await expect(deleteOrderPermanently('66c000000000000000000001')).rejects.toBe(failure)
    expect(mocks.deleteOne).not.toHaveBeenCalled()

    await expect(deleteOrderPermanently('66c000000000000000000001')).resolves.toBe(order)
    expect(mocks.deleteOrderEvent).toHaveBeenCalledTimes(2)
    expect(mocks.deleteOne).toHaveBeenCalledTimes(1)
  })

  it('can retry row deletion when the database fails after calendar cleanup', async () => {
    const order = makeOrder()
    const failure = new Error('database unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.deleteOrderEvent.mockResolvedValue(true)
    mocks.deleteOne.mockRejectedValueOnce(failure).mockResolvedValueOnce({ deletedCount: 1 })

    await expect(deleteOrderPermanently('66c000000000000000000001')).rejects.toBe(failure)
    await expect(deleteOrderPermanently('66c000000000000000000001')).resolves.toBe(order)
    expect(mocks.deleteOrderEvent).toHaveBeenCalledTimes(2)
    expect(mocks.deleteOne).toHaveBeenCalledTimes(2)
  })
})

describe('explicit calendar side effects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.syncOrderToCalendar.mockResolvedValue({ calendarEventIds: {} })
    mocks.deleteOrderEvent.mockResolvedValue(true)
  })

  it('keeps a persisted edit successful and returns a warning when calendar sync fails', async () => {
    const order = makeOrder()
    order.confirmed = true
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.applyOrderPatch.mockReturnValue({ name: 'Updated', pricing: {}, price: 1, fees: [], boxesPrice: 0 })
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    const result = await updateOrder('66c000000000000000000001', { name: 'Updated' })

    expect(order.save).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ order, warning: { code: 'CALENDAR_SYNC_FAILED' } })
  })

  it('does not mark an order confirmed when calendar precondition fails', async () => {
    const order = makeOrder()
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    await expect(confirmOrder('66c000000000000000000001', 'user-id')).rejects.toMatchObject({
      name: 'CalendarUnavailableError',
    })
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled()
    expect(order.confirmed).toBe(false)
  })

  it('rechecks deletion under the confirmation lock', async () => {
    const initialOrder = makeOrder()
    const deletedOrder = { ...makeOrder(), deletedAt: new Date('2026-01-01T00:00:00.000Z') }
    mocks.findById.mockResolvedValueOnce(initialOrder).mockResolvedValueOnce(deletedOrder)

    await expect(confirmOrder('66c000000000000000000001', 'user-id')).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Deleted orders cannot be confirmed',
    })
    expect(mocks.syncOrderToCalendar).not.toHaveBeenCalled()
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('persists cancellation even when calendar sync fails', async () => {
    const order = makeOrder()
    order.confirmed = true
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    const result = await cancelOrder('66c000000000000000000001')

    expect(result).toMatchObject({ order, warning: { code: 'CALENDAR_SYNC_FAILED' } })
    expect(mocks.findByIdAndUpdate).toHaveBeenCalledTimes(1)
  })

  it('rejects cancellation of a deleted order before changing Mongo', async () => {
    const order = makeOrder()
    order.deletedAt = new Date('2026-01-01T00:00:00.000Z')
    mocks.findById.mockResolvedValue(order)

    await expect(cancelOrder('66c000000000000000000001')).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Deleted orders cannot be canceled',
    })
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled()
    expect(mocks.syncOrderToCalendar).not.toHaveBeenCalled()
  })

  it('persists the new color when calendar sync fails', async () => {
    const order = makeOrder()
    order.confirmed = true
    const failure = new Error('calendar unavailable')
    mocks.findOneAndUpdate.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    const result = await updateOrderColor('66c000000000000000000001', '8')

    expect(result).toMatchObject({ order, warning: { code: 'CALENDAR_SYNC_FAILED' } })
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '66c000000000000000000001' },
      { $set: { eventColor: '8' } },
      { new: true },
    )
  })

  it('does not soft-delete an order when calendar cleanup fails', async () => {
    const order = makeOrder()
    order.calendarEventIds.main = 'main-event'
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.deleteOrderEvent.mockRejectedValue(failure)

    await expect(deleteOrder('66c000000000000000000001')).rejects.toMatchObject({
      name: 'CalendarUnavailableError',
    })
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('deletes calendar events before marking an order deleted', async () => {
    const order = makeOrder()
    order.calendarEventIds.main = 'main-event'
    mocks.findById.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockResolvedValue({ ...order, deletedAt: new Date() })

    await deleteOrder('66c000000000000000000001')

    expect(mocks.deleteOrderEvent.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findByIdAndUpdate.mock.invocationCallOrder[0],
    )
  })
})
