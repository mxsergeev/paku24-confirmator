import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAppOrder } from '../shared/testFixtures/orderFixtures'
import { toCommunicationOrder, toCreateOrderPayload } from '../shared/orderSerialization'

const mocks = vi.hoisted(() => ({
  addEventToCalendar: vi.fn(),
  add: vi.fn(),
  confirm: vi.fn(),
}))

vi.mock('./calendarAPI', () => ({ default: mocks.addEventToCalendar }))
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
    mocks.addEventToCalendar.mockResolvedValue({ message: 'Added' })
    mocks.add.mockResolvedValue({ id: 'new-order-id' })
    mocks.confirm.mockResolvedValue({ message: 'Confirmed' })
  })

  it('adds and confirms an existing order without creating a duplicate', async () => {
    const order = makeAppOrder()

    const response = await addOrderToCalendar({ order, orderId: 'existing-order-id' })

    expect(response).toEqual({ message: 'Added' })
    expect(mocks.addEventToCalendar).toHaveBeenCalledWith({
      order: toCommunicationOrder(order),
      orderId: 'existing-order-id',
    })
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.confirm).toHaveBeenCalledWith('existing-order-id')
  })

  it('creates an app order before confirming when no order id exists', async () => {
    const order = makeAppOrder()

    await addOrderToCalendar({ order, orderId: null })

    expect(mocks.add).toHaveBeenCalledWith({ order: toCreateOrderPayload(order) })
    expect(mocks.confirm).toHaveBeenCalledWith('new-order-id')
  })
})
