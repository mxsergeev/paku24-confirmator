import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
  deleteOrderEvent: vi.fn(),
  syncOrderToCalendar: vi.fn(),
  withOrderCalendarLock: vi.fn((_order, operation) => operation()),
  normalizeOrderPatch: vi.fn(),
}))

vi.mock('../../models/order.js', () => ({
  default: {
    findById: mocks.findById,
    findByIdAndUpdate: mocks.findByIdAndUpdate,
    deleteOne: mocks.deleteOne,
  },
}))

vi.mock('../calendar/calendar.sync.js', () => ({
  deleteOrderEvent: mocks.deleteOrderEvent,
  syncOrderToCalendar: mocks.syncOrderToCalendar,
  withOrderCalendarLock: mocks.withOrderCalendarLock,
}))

vi.mock('../../../src/shared/orderModel.js', () => ({
  normalizeOrderPatch: mocks.normalizeOrderPatch,
}))

const {
  deleteOrderPermanently,
  updateOrder,
  confirmOrder,
  cancelOrder,
  deleteOrder,
  restoreOrder,
} = await import('./orderPool.service.js')

function makeOrder() {
  return {
    confirmed: false,
    deletedAt: null,
    calendarEventIds: { main: null, boxDelivery: null, boxReturn: null },
    toObject() {
      const { save, toObject, ...snapshot } = this
      return snapshot
    },
    save: vi.fn(),
  }
}

describe('order pool service error handling', () => {
  it('propagates unexpected update errors without converting them to validation errors', async () => {
    const order = makeOrder()
    const failure = new TypeError('programmer failure')
    mocks.findById.mockResolvedValue(order)
    mocks.normalizeOrderPatch.mockImplementation(() => {
      throw failure
    })

    await expect(updateOrder('66c000000000000000000001', { name: 'Updated' })).rejects.toBe(failure)
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

    expect(mocks.deleteOrderEvent).toHaveBeenCalledWith(order, { lock: false })
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
    mocks.normalizeOrderPatch.mockReturnValue({ name: 'Updated' })
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    const result = await updateOrder('66c000000000000000000001', { name: 'Updated' })

    expect(order.save).toHaveBeenCalledTimes(1)
    expect(mocks.syncOrderToCalendar).toHaveBeenCalledWith(order, { lock: false })
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

  it('returns an already-confirmed order idempotently without contacting calendar', async () => {
    const order = makeOrder()
    order.confirmed = true
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    await expect(confirmOrder('66c000000000000000000001', 'user-id')).resolves.toEqual({
      order,
      warning: null,
    })

    expect(mocks.syncOrderToCalendar).not.toHaveBeenCalled()
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('loads the order while holding the confirmation lock', async () => {
    const deletedOrder = { ...makeOrder(), deletedAt: new Date('2026-01-01T00:00:00.000Z') }
    mocks.findById.mockResolvedValue(deletedOrder)

    await expect(confirmOrder('66c000000000000000000001', 'user-id')).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Deleted orders cannot be confirmed',
    })
    expect(mocks.withOrderCalendarLock).toHaveBeenCalledWith(
      '66c000000000000000000001',
      expect.any(Function),
    )
    expect(mocks.findById).toHaveBeenCalledTimes(1)
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

  it('preserves the event color preference when canceling', async () => {
    const order = { ...makeOrder(), confirmed: true, eventColor: '11' }
    mocks.findById.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockResolvedValue(order)

    await cancelOrder('66c000000000000000000001')

    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      { _id: '66c000000000000000000001' },
      { canceledAt: expect.any(String) },
      { new: true },
    )
    expect(order.eventColor).toBe('11')
  })

  it('preserves the event color preference when restoring', async () => {
    const order = { ...makeOrder(), confirmed: true, eventColor: null }
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockResolvedValue(order)

    await expect(restoreOrder('66c000000000000000000001')).resolves.toMatchObject({ order })

    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      { _id: '66c000000000000000000001' },
      { $unset: { deletedAt: 1, canceledAt: 1 } },
      { new: true },
    )
    expect(order.eventColor).toBeNull()
  })

  it('reconciles a confirmed restore before activating Mongo', async () => {
    const order = {
      ...makeOrder(),
      confirmed: true,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      canceledAt: new Date('2026-01-02T00:00:00.000Z'),
      eventColor: '11',
      pricingOverrides: { price: null, fees: null, boxesPrice: null },
    }
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockResolvedValue({ ...order, deletedAt: undefined, canceledAt: undefined })

    await restoreOrder('66c000000000000000000001')

    const candidate = mocks.syncOrderToCalendar.mock.calls[0][0]
    expect(candidate).not.toHaveProperty('deletedAt')
    expect(candidate).not.toHaveProperty('canceledAt')
    expect(candidate.eventColor).toBe('11')
    expect(candidate.pricingOverrides).toEqual({ price: null, fees: null, boxesPrice: null })
    expect(mocks.syncOrderToCalendar).toHaveBeenCalledWith(candidate, { lock: false })
    expect(mocks.syncOrderToCalendar.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findByIdAndUpdate.mock.invocationCallOrder[0],
    )
    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      { _id: '66c000000000000000000001' },
      { $unset: { deletedAt: 1, canceledAt: 1 } },
      { new: true },
    )
  })

  it('does not activate a confirmed order when calendar restore fails', async () => {
    const order = { ...makeOrder(), confirmed: true, deletedAt: new Date() }
    const failure = new Error('calendar unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockRejectedValue(failure)

    await expect(restoreOrder('66c000000000000000000001')).rejects.toMatchObject({
      name: 'CalendarUnavailableError',
      message: 'Order was not restored because its calendar events could not be synchronized.',
    })
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('restores an unconfirmed order without contacting calendar', async () => {
    const order = { ...makeOrder(), deletedAt: new Date() }
    const restored = { ...order, deletedAt: undefined, canceledAt: undefined }
    mocks.findById.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockResolvedValue(restored)

    await expect(restoreOrder('66c000000000000000000001')).resolves.toMatchObject({ order: restored })

    expect(mocks.syncOrderToCalendar).not.toHaveBeenCalled()
    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith(
      { _id: '66c000000000000000000001' },
      { $unset: { deletedAt: 1, canceledAt: 1 } },
      { new: true },
    )
  })

  it('rolls Calendar back when Mongo activation fails after confirmed restore', async () => {
    const order = { ...makeOrder(), confirmed: true, deletedAt: new Date() }
    const failure = new Error('database unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockRejectedValue(failure)

    await expect(restoreOrder('66c000000000000000000001')).rejects.toBe(failure)

    const candidate = mocks.syncOrderToCalendar.mock.calls[0][0]
    expect(mocks.deleteOrderEvent).toHaveBeenCalledWith(candidate, { lock: false })
  })

  it('keeps restore failed when Calendar rollback also fails', async () => {
    const order = { ...makeOrder(), confirmed: true, deletedAt: new Date() }
    const databaseFailure = new Error('database unavailable')
    const rollbackFailure = new Error('rollback unavailable')
    mocks.findById.mockResolvedValue(order)
    mocks.syncOrderToCalendar.mockResolvedValue(order)
    mocks.findByIdAndUpdate.mockRejectedValue(databaseFailure)
    mocks.deleteOrderEvent.mockRejectedValue(rollbackFailure)

    await expect(restoreOrder('66c000000000000000000001')).rejects.toMatchObject({
      message: 'database unavailable',
      rollbackError: rollbackFailure,
    })
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalledWith(
      { _id: '66c000000000000000000001' },
      { $set: expect.anything() },
      expect.anything(),
    )
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
