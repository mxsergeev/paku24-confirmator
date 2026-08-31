import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCanonicalAppOrder } from '../shared/testFixtures/orderFixtures'
import { toCreateOrderPayload } from '../shared/orderSerialization'

const mocks = vi.hoisted(() => ({
  syncOrder: vi.fn(),
  add: vi.fn(),
  confirm: vi.fn(),
}))

vi.mock('./calendarAPI', () => ({
  default: { syncOrder: mocks.syncOrder },
}))
vi.mock('./orderPoolAPI', () => ({
  default: {
    add: mocks.add,
    confirm: mocks.confirm,
  },
}))

import addOrderToCalendar from './orderCalendarWorkflow'

describe('addOrderToCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.syncOrder.mockResolvedValue({ message: 'Added', createdEvent: 'event' })
    mocks.add.mockResolvedValue({ id: 'new-order-id' })
    mocks.confirm.mockResolvedValue({ message: 'Confirmed' })
  })

  it('persists a new order, syncs by its ID, then confirms it', async () => {
    const order = makeCanonicalAppOrder()

    const response = await addOrderToCalendar({ order, orderId: null })

    expect(response).toEqual({ message: 'Added', createdEvent: 'event' })
    expect(mocks.add).toHaveBeenCalledWith({ order: toCreateOrderPayload(order) })
    expect(mocks.syncOrder).toHaveBeenCalledWith('new-order-id')
    expect(mocks.confirm).toHaveBeenCalledWith('new-order-id')
    expect(mocks.add.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.syncOrder.mock.invocationCallOrder[0],
    )
    expect(mocks.syncOrder.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.confirm.mock.invocationCallOrder[0],
    )
  })

  it('does not sync or confirm when persistence fails', async () => {
    const order = makeCanonicalAppOrder()
    const failure = new Error('database unavailable')
    mocks.add.mockRejectedValue(failure)

    await expect(addOrderToCalendar({ order })).rejects.toBe(failure)

    expect(mocks.syncOrder).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('does not confirm when calendar synchronization fails', async () => {
    const order = makeCanonicalAppOrder()
    const failure = new Error('calendar unavailable')
    const onOrderPersisted = vi.fn()
    mocks.syncOrder.mockRejectedValue(failure)

    await expect(addOrderToCalendar({ order, onOrderPersisted })).rejects.toBe(failure)

    expect(mocks.add).toHaveBeenCalledTimes(1)
    expect(onOrderPersisted).toHaveBeenCalledWith('new-order-id')
    expect(mocks.syncOrder).toHaveBeenCalledWith('new-order-id')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('confirms an existing order without adding a duplicate', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'existing-order-id' }

    const response = await addOrderToCalendar({ order })

    expect(response).toEqual({ message: 'Added', createdEvent: 'event' })
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.syncOrder).toHaveBeenCalledWith('existing-order-id')
    expect(mocks.confirm).toHaveBeenCalledWith('existing-order-id')
  })

  it('uses a persisted ID on retry after a successful sync but failed confirmation', async () => {
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
    expect(mocks.syncOrder).toHaveBeenNthCalledWith(1, 'new-order-id')
    expect(mocks.syncOrder).toHaveBeenNthCalledWith(2, 'new-order-id')
    expect(mocks.confirm).toHaveBeenNthCalledWith(2, 'new-order-id')
  })

  it('uses an explicit order ID when it is provided', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'order-from-object' }

    await addOrderToCalendar({ order, orderId: 'explicit-order-id' })

    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.syncOrder).toHaveBeenCalledWith('explicit-order-id')
    expect(mocks.confirm).toHaveBeenCalledWith('explicit-order-id')
  })

  it('does not reconfirm an order that is already confirmed', async () => {
    const order = { ...makeCanonicalAppOrder(), id: 'confirmed-order-id', confirmed: true }

    await addOrderToCalendar({ order })

    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.syncOrder).toHaveBeenCalledWith('confirmed-order-id')
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
