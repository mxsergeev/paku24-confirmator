// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeReceiptDraftStorageKey } from './receiptData.helpers'

const mocks = vi.hoisted(() => ({
  calendarProps: null,
  calendarQuery: null,
  location: { state: null, search: '' },
  receiptProps: null,
  routeMatches: {},
  enqueueSnackbar: vi.fn(),
  useCalendarOrders: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
  history: { goBack: vi.fn(), push: vi.fn(), replace: vi.fn() },
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
  useLocation: () => mocks.location,
  useRouteMatch: (path) => (path ? mocks.routeMatches[path] || null : { path: '/calendar', url: '/calendar' }),
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

vi.mock('./OrderDialog', () => ({ default: () => null }))
vi.mock('./NewOrderDialog', () => ({ default: () => null }))
vi.mock('./ReceiptPage', () => ({
  default: (props) => {
    mocks.receiptProps = props
    return <div data-testid="receipt-page" />
  },
}))

import Calendar from './Calendar'

describe('Calendar controls', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.calendarProps = null
    mocks.calendarQuery = null
    mocks.location = { state: null, search: '' }
    mocks.receiptProps = null
    mocks.routeMatches = {}
    mocks.enqueueSnackbar.mockReset()
    mocks.history.replace.mockReset()
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

  it('passes a stored receipt draft and document type to the receipt page', () => {
    const orderId = '66c000000000000000000001'
    const draftKey = 'receipt-test-key'
    const receiptDraft = {
      customerName: 'Edited Customer',
      customerEmail: 'edited@example.com',
      customerAddress: 'Edited street 1',
      totalAmount: '220',
    }
    window.localStorage.setItem(
      makeReceiptDraftStorageKey(draftKey),
      JSON.stringify({
        receiptDraft,
        documentType: 'invoice',
        expiresAt: Date.now() + 60_000,
      }),
    )
    mocks.location = {
      pathname: '/calendar/receipt/order-1',
      state: { documentType: 'invoice' },
      search: `?receiptDraftKey=${draftKey}`,
      hash: '',
    }
    mocks.routeMatches['/calendar/receipt/:orderId'] = { params: { orderId } }

    render(<Calendar />)

    expect(screen.getByTestId('receipt-page')).toBeInTheDocument()
    expect(mocks.receiptProps).toMatchObject({
      orderId,
      initialDraft: { ...receiptDraft, documentType: 'invoice' },
      documentType: 'invoice',
    })
    expect(mocks.history.replace).toHaveBeenCalledWith({
      pathname: '/calendar/receipt/order-1',
      search: '',
      hash: '',
      state: {
        documentType: 'invoice',
        receiptDraft: { ...receiptDraft, documentType: 'invoice' },
      },
    })
    expect(window.localStorage.getItem(makeReceiptDraftStorageKey(draftKey))).toBeNull()
  })

  it('warns when the receipt draft checkpoint cannot be restored', () => {
    mocks.location = { state: null, search: '?receiptDraftKey=missing-draft' }
    mocks.routeMatches['/calendar/receipt/:orderId'] = {
      params: { orderId: '66c000000000000000000001' },
    }

    render(<Calendar />)

    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
      'Receipt details could not be restored. The edited draft may have expired.',
      { variant: 'warning' },
    )
  })
})
