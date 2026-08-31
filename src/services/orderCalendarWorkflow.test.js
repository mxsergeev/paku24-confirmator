import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCanonicalAppOrder } from '../shared/testFixtures/orderFixtures'
import { toCreateOrderPayload, toUpdateOrderPayload } from '../shared/orderSerialization'

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  confirm: vi.fn(),
}))

vi.mock('./orderPoolAPI', () => ({
  default: {
    add: mocks.add,
    update: mocks.update,
    confirm: mocks.confirm,
  },
}))

import addOrderToCalendar from './orderCalendarWorkflow'

describe('addOrderToCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.add.mockResolvedValue({ id: 'new-order-id' })
    mocks.update.mockResolvedValue({ message: 'Updated' })
    mocks.confirm.mockResolvedValue({ message: 'Confirmed' })
  })

  it('persists a new order, then lets confirmation own calendar synchronization', async () => {
    const order = makeCanonicalAppOrder()

    const response = await addOrderToCalendar({ order, orderId: null })

    expect(response).toEqual({ message: 'Confirmed' })
    expect(mocks.add).toHaveBeenCalledWith({ order: toCreateOrderPayload(order) })
    expect(mocks.confirm).toHaveBeenCalledWith('new-order-id')
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.add.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.confirm.mock.invocationCallOrder[0],
    )
  })

  it('does not confirm when persistence fails', async () => {
    const order = makeCanonicalAppOrder()
    const failure = new Error('database unavailable')
    mocks.add.mockRejectedValue(failure)

    await expect(addOrderToCalendar({ order })).rejects.toBe(failure)

    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('does not confirm when the calendar precondition fails', async () => {
    const order = makeCanonicalAppOrder()
    const failure = new Error('calendar unavailable')
    const onOrderPersisted = vi.fn()
    mocks.confirm.mockRejectedValue(failure)

    await expect(addOrderToCalendar({ order, onOrderPersisted })).rejects.toBe(failure)

    expect(mocks.add).toHaveBeenCalledTimes(1)
    expect(onOrderPersisted).toHaveBeenCalledWith('new-order-id', expect.any(Object))
    expect(mocks.confirm).toHaveBeenCalledWith('new-order-id')
  })

  it('persists current edits for an existing unconfirmed order before confirmation', async () => {
    const order = {
      ...makeCanonicalAppOrder(),
      id: 'existing-order-id',
      name: 'Edited locally before calendar action',
    }
    const updatedOrder = { ...order, confirmed: false }
    const confirmedOrder = { ...updatedOrder, confirmed: true }
    mocks.update.mockResolvedValue({ message: 'Updated', order: updatedOrder })
    mocks.confirm.mockResolvedValue({ message: 'Confirmed', order: confirmedOrder })
    const onOrderUpdated = vi.fn()

    const response = await addOrderToCalendar({ order, onOrderUpdated })

    expect(response).toEqual({ message: 'Confirmed', order: confirmedOrder })
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith('existing-order-id', toUpdateOrderPayload(order))
    expect(mocks.confirm).toHaveBeenCalledWith('existing-order-id')
    expect(onOrderUpdated).toHaveBeenNthCalledWith(1, updatedOrder, expect.any(Object))
    expect(onOrderUpdated).toHaveBeenNthCalledWith(2, confirmedOrder, expect.any(Object))
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.confirm.mock.invocationCallOrder[0],
    )
  })

  it('rejects an authoritative deleted order without confirming it', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'existing-order-id' }
    const deletedOrder = { ...order, deletedAt: '2026-01-01T00:00:00.000Z', confirmed: true }
    mocks.update.mockResolvedValue({ message: 'Updated', order: deletedOrder })

    await expect(addOrderToCalendar({ order })).rejects.toThrow(
      'Deleted orders cannot be synchronized to calendar.',
    )

    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('confirms a newly-created order even if stale lifecycle data says confirmed', async () => {
    const order = { ...makeCanonicalAppOrder(), confirmed: true }

    await addOrderToCalendar({ order })

    expect(mocks.add).toHaveBeenCalledTimes(1)
    expect(mocks.confirm).toHaveBeenCalledWith('new-order-id')
  })

  it('uses a persisted ID on retry after persistence succeeds but confirmation fails', async () => {
    let retryOrder = makeCanonicalAppOrder()
    const failure = new Error('confirmation unavailable')
    mocks.confirm.mockRejectedValueOnce(failure)

    await expect(
      addOrderToCalendar({
        order: retryOrder,
        onOrderPersisted: (id) => {
          retryOrder = { ...retryOrder, id }
        },
      }),
    ).rejects.toBe(failure)

    await addOrderToCalendar({ order: retryOrder })

    expect(mocks.add).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('new-order-id', toUpdateOrderPayload(retryOrder))
    expect(mocks.confirm).toHaveBeenNthCalledWith(2, 'new-order-id')
  })

  it('uses an explicit order ID and persists its current state', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'order-from-object' }
    mocks.update.mockResolvedValue({ message: 'Updated', order: { ...order, confirmed: true } })

    await addOrderToCalendar({ order, orderId: 'explicit-order-id' })

    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith('explicit-order-id', toUpdateOrderPayload(order))
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('updates an already-confirmed order once without a second calendar call', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'confirmed-order-id', confirmed: true }
    mocks.update.mockResolvedValue({ message: 'Updated', order })

    await addOrderToCalendar({ order })

    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith('confirmed-order-id', toUpdateOrderPayload(order))
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('returns a calendar warning from the persisted confirmed-order update', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'confirmed-order-id', confirmed: true }
    const updateResponse = {
      message: 'Order updated',
      order,
      warning: { code: 'CALENDAR_SYNC_FAILED', message: 'Calendar unavailable' },
    }
    mocks.update.mockResolvedValue(updateResponse)

    await expect(addOrderToCalendar({ order })).resolves.toBe(updateResponse)
  })

  it('rejects deleted orders before persistence or calendar calls', async () => {
    const order = {
      ...makeCanonicalAppOrder(),
      id: 'deleted-order-id',
      deletedAt: '2026-01-01T00:00:00.000Z',
    }

    await expect(addOrderToCalendar({ order })).rejects.toThrow(
      'Deleted orders cannot be synchronized to calendar.',
    )

    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
