import { describe, expect, it, vi } from 'vitest'

import {
  updateCalendarOrdersCache,
  updateCalendarOrdersColor,
} from './useOrderDialogEventColor'

describe('calendar order event color updates', () => {
  it('updates the matching order in the canonical array and preserves other orders', () => {
    const first = { id: 'first', eventColor: '1' }
    const second = { id: 'second', eventColor: '2' }
    const orders = [first, second]

    const updated = updateCalendarOrdersColor(orders, 'second', '7')

    expect(updated).toEqual([first, { ...second, eventColor: '7' }])
    expect(updated[0]).toBe(first)
    expect(updated[1]).not.toBe(second)
  })

  it('updates each cached calendar range only when it contains the order', () => {
    const currentRange = [{ id: 'order-1', eventColor: '1' }]
    const otherRange = [{ id: 'order-2', eventColor: '2' }]
    const queryClient = {
      getQueriesData: vi.fn(() => [
        [['calendar-orders', 'current'], currentRange],
        [['calendar-orders', 'other'], otherRange],
      ]),
      setQueryData: vi.fn(),
    }

    updateCalendarOrdersCache(queryClient, 'order-1', '7')

    expect(queryClient.getQueriesData).toHaveBeenCalledWith({ queryKey: ['calendar-orders'] })
    expect(queryClient.setQueryData).toHaveBeenCalledTimes(1)
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ['calendar-orders', 'current'],
      [{ id: 'order-1', eventColor: '7' }]
    )
  })

  it('does not treat unsupported cache values as calendar order data', () => {
    const queryClient = {
      getQueriesData: vi.fn(() => [[['calendar-orders'], { orders: [{ id: 'order-1' }] }]]),
      setQueryData: vi.fn(),
    }

    updateCalendarOrdersCache(queryClient, 'order-1', '7')

    expect(queryClient.setQueryData).not.toHaveBeenCalled()
  })
})
