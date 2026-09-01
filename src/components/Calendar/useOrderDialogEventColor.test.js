// @vitest-environment jsdom

import React, { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryClient: {
    getQueriesData: vi.fn(() => []),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  },
  updateColor: vi.fn(),
  enqueueSnackbar: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}))

vi.mock('../../services/ordersAPI', () => ({
  default: { updateColor: mocks.updateColor },
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

import {
  updateCalendarOrdersCache,
  updateCalendarOrdersColor,
} from './useOrderDialogEventColor'
import useOrderDialogEventColor from './useOrderDialogEventColor'

afterEach(() => {
  vi.useRealTimers()
  mocks.queryClient.getQueriesData.mockReset()
  mocks.queryClient.getQueriesData.mockReturnValue([])
  mocks.queryClient.setQueryData.mockReset()
  mocks.queryClient.invalidateQueries.mockReset()
  mocks.updateColor.mockReset()
  mocks.enqueueSnackbar.mockReset()
})

function EventColorHarness({ initialOrder, initialOrderId = 'order-1' }) {
  const [order, setOrder] = useState(initialOrder)
  const [orderId, setOrderId] = useState(initialOrderId)
  const { onEventColorChange } = useOrderDialogEventColor({
    order,
    orderId,
    setOrder,
  })

  return (
    <>
      <button type="button" onClick={() => onEventColorChange('1')}>
        Set first color
      </button>
      <button type="button" onClick={() => onEventColorChange('2')}>
        Set second color
      </button>
      <button
        type="button"
        onClick={() => {
          setOrder({ id: 'order-2', eventColor: '8' })
          setOrderId('order-2')
        }}
      >
        Switch order
      </button>
      <button
        type="button"
        onClick={() => setOrder((currentOrder) => ({ ...currentOrder, status: 'newer' }))}
      >
        Update order
      </button>
      <span data-testid="event-color">{order.eventColor}</span>
      <span data-testid="order-status">{order.status || ''}</span>
    </>
  )
}

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

  it('ignores a stale response from an older color request', async () => {
    vi.useFakeTimers()
    const firstRequest = {}
    const secondRequest = {}
    firstRequest.promise = new Promise((resolve) => {
      firstRequest.resolve = resolve
    })
    secondRequest.promise = new Promise((resolve) => {
      secondRequest.resolve = resolve
    })
    mocks.updateColor
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    render(<EventColorHarness initialOrder={{ id: 'order-1', eventColor: '7' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Set second color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    firstRequest.resolve({ order: { id: 'order-1', eventColor: '1' } })
    secondRequest.resolve({ order: { id: 'order-1', eventColor: '2' } })
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('2')

  })

  it('rolls back to the committed color when overlapping requests fail', async () => {
    vi.useFakeTimers()
    const firstRequest = {}
    const secondRequest = {}
    firstRequest.promise = new Promise((_, reject) => {
      firstRequest.reject = reject
    })
    secondRequest.promise = new Promise((_, reject) => {
      secondRequest.reject = reject
    })
    mocks.updateColor
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    render(<EventColorHarness initialOrder={{ id: 'order-1', eventColor: '7' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Set second color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    firstRequest.reject(new Error('first request failed'))
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('2')

    secondRequest.reject(new Error('second request failed'))
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('7')
  })

  it('keeps an earlier persisted color when a later request fails', async () => {
    vi.useFakeTimers()
    const firstRequest = {}
    const secondRequest = {}
    firstRequest.promise = new Promise((resolve) => {
      firstRequest.resolve = resolve
    })
    secondRequest.promise = new Promise((_, reject) => {
      secondRequest.reject = reject
    })
    mocks.updateColor
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    render(<EventColorHarness initialOrder={{ id: 'order-1', eventColor: '7' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Set second color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    firstRequest.resolve({ order: { id: 'order-1', eventColor: '1' } })
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('2')

    secondRequest.reject(new Error('second request failed'))
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('1')
  })

  it('does not let a previous order request change the next order', async () => {
    vi.useFakeTimers()
    const previousOrderRequest = {}
    const nextOrderRequest = {}
    previousOrderRequest.promise = new Promise((resolve) => {
      previousOrderRequest.resolve = resolve
    })
    nextOrderRequest.promise = new Promise((_, reject) => {
      nextOrderRequest.reject = reject
    })
    mocks.updateColor
      .mockImplementationOnce(() => previousOrderRequest.promise)
      .mockImplementationOnce(() => nextOrderRequest.promise)

    render(<EventColorHarness initialOrder={{ id: 'order-1', eventColor: '7' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Switch order' }))
    fireEvent.click(screen.getByRole('button', { name: 'Set second color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })

    previousOrderRequest.resolve({ order: { id: 'order-1', eventColor: '1' } })
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('2')

    nextOrderRequest.reject(new Error('next order request failed'))
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('8')
  })

  it('ignores an old request after switching orders without another color change', async () => {
    vi.useFakeTimers()
    const previousOrderRequest = {}
    previousOrderRequest.promise = new Promise((resolve) => {
      previousOrderRequest.resolve = resolve
    })
    mocks.updateColor.mockImplementationOnce(() => previousOrderRequest.promise)

    render(<EventColorHarness initialOrder={{ id: 'order-1', eventColor: '7' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Switch order' }))

    previousOrderRequest.resolve({ order: { id: 'order-1', eventColor: '1' } })
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('8')
    expect(mocks.updateColor).toHaveBeenCalledTimes(1)
  })

  it('restores a previous order cache after its color request fails', async () => {
    vi.useFakeTimers()
    const previousOrder = { id: 'order-1', eventColor: '7' }
    const currentRange = [previousOrder]
    const previousOrderRequest = {}
    previousOrderRequest.promise = new Promise((_, reject) => {
      previousOrderRequest.reject = reject
    })
    mocks.queryClient.getQueriesData.mockReturnValue([
      [['calendar-orders', 'current'], currentRange],
    ])
    mocks.updateColor.mockImplementationOnce(() => previousOrderRequest.promise)

    render(<EventColorHarness initialOrder={previousOrder} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Switch order' }))

    previousOrderRequest.reject(new Error('previous order request failed'))
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('8')
    expect(mocks.queryClient.setQueryData).toHaveBeenLastCalledWith(
      ['calendar-orders', 'current'],
      [{ ...previousOrder, eventColor: '7' }],
    )
  })

  it('does not roll back newer order fields when a color update fails', async () => {
    vi.useFakeTimers()
    const request = {}
    request.promise = new Promise((_, reject) => {
      request.reject = reject
    })
    mocks.updateColor.mockImplementationOnce(() => request.promise)

    render(<EventColorHarness initialOrder={{ id: 'order-1', eventColor: '7' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Set first color' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update order' }))

    request.reject(new Error('color request failed'))
    await act(async () => {})
    expect(screen.getByTestId('event-color')).toHaveTextContent('7')
    expect(screen.getByTestId('order-status')).toHaveTextContent('newer')
  })
})
