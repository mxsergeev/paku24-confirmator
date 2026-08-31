// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  calendarProps: null,
  calendarQuery: null,
  useCalendarOrders: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  history: { goBack: vi.fn(), push: vi.fn() },
}))

vi.mock('@fullcalendar/react', () => ({
  default: React.forwardRef((props, _ref) => {
    mocks.calendarProps = props
    return null
  }),
}))

vi.mock('../../hooks/useCalendarOrders', () => ({
  useCalendarOrders: (props) => {
    mocks.calendarQuery = props
    return mocks.useCalendarOrders(props)
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}))

vi.mock('react-router-dom', () => ({
  useHistory: () => mocks.history,
  useLocation: () => ({ state: null }),
  useRouteMatch: (path) =>
    path ? null : { path: '/calendar', url: '/calendar' },
}))

vi.mock('./OrderDialog', () => ({ default: () => null }))
vi.mock('./NewOrderDialog', () => ({ default: () => null }))
vi.mock('./ReceiptPage', () => ({ default: () => null }))

import Calendar from './Calendar'

describe('Calendar controls', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.calendarProps = null
    mocks.calendarQuery = null
    mocks.useCalendarOrders.mockReset()
    mocks.useCalendarOrders.mockReturnValue({
      data: [],
      refetch: vi.fn(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })
  })

  it('renders the deleted-order toggle in a React-owned toolbar', () => {
    render(<Calendar />)

    const toolbar = screen.getByRole('toolbar', { name: 'Calendar options' })
    const toggle = screen.getByRole('checkbox', { name: 'Show deleted' })

    expect(toolbar).toContainElement(toggle)
    expect(toggle).not.toBeChecked()
    expect(mocks.calendarQuery.deleted).toBe(false)

    fireEvent.click(toggle)

    expect(toggle).toBeChecked()
    expect(mocks.calendarQuery.deleted).toBeNull()
    expect(window.localStorage.getItem('calendar-show-deleted-orders')).toBe('true')
  })

  it('leaves navigation, view, and app actions to FullCalendar', () => {
    render(<Calendar />)

    expect(mocks.calendarProps.headerToolbar).toEqual({
      left: 'dayGridMonth,timeGridWeek,listWeek,multiMonthYear prev,next today',
      center: 'title',
      right: 'createOrderButton refreshOrdersButton',
    })
  })

  it('passes order and box colors through FullCalendar event props', () => {
    mocks.useCalendarOrders.mockReturnValue({
      data: [
        {
          id: 'order-1',
          date: '2026-01-15T07:00:00.000Z',
          duration: 2,
          service: { id: '1', name: "Van and driver (doesn't assist in carrying)" },
          address: { street: 'Mannerheimintie 10' },
          name: 'Test Customer',
          boxes: {
            deliveryDate: '2026-01-16T07:00:00.000Z',
            returnDate: '2026-01-24T07:00:00.000Z',
            amount: 1,
          },
          confirmed: true,
          eventColor: '7',
        },
      ],
      refetch: vi.fn(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })

    render(<Calendar />)

    const events = mocks.calendarProps.events
    expect(events).toHaveLength(3)
    expect(events[0]).toMatchObject({
      backgroundColor: '#039be5',
      borderColor: '#039be5',
      extendedProps: { color: '#039be5', eventType: 'order' },
    })
    expect(events[1]).toMatchObject({
      backgroundColor: '#7986cb',
      borderColor: '#7986cb',
      extendedProps: { color: '#7986cb', eventType: 'boxDelivery' },
    })
    expect(events[2]).toMatchObject({
      backgroundColor: '#7986cb',
      borderColor: '#7986cb',
      extendedProps: { color: '#7986cb', eventType: 'boxReturn' },
    })
  })
})
