// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  calendarProps: null,
  calendarQuery: null,
  isMobile: false,
  location: { state: null, search: '' },
  newOrderProps: null,
  receiptProps: null,
  orderDialogProps: null,
  routedOrderProps: null,
  routeMatches: {},
  enqueueSnackbar: vi.fn(),
  useCalendarOrders: vi.fn(),
  useRoutedOrder: vi.fn(),
  history: { goBack: vi.fn(), push: vi.fn(), replace: vi.fn() },
}))

vi.mock('@fullcalendar/react', () => ({
  default: React.forwardRef((props, ref) => {
    mocks.calendarProps = props
    React.useImperativeHandle(ref, () => ({
      getApi: () => ({ prev: vi.fn(), next: vi.fn() }),
    }))
    return null
  }),
}))

vi.mock('@material-ui/core/useMediaQuery', () => ({
  default: () => mocks.isMobile,
}))

vi.mock('../../hooks/useCalendarOrders', () => ({
  useCalendarOrders: (props) => {
    mocks.calendarQuery = props
    return mocks.useCalendarOrders(props)
  },
}))

vi.mock('../../hooks/useRoutedOrder', () => ({
  useRoutedOrder: (props) => {
    mocks.routedOrderProps = props
    return mocks.useRoutedOrder(props)
  },
}))

vi.mock('react-router-dom', () => ({
  useHistory: () => mocks.history,
  useLocation: () => mocks.location,
  useRouteMatch: (path) => (path ? mocks.routeMatches[path] || null : { path: '/calendar', url: '/calendar' }),
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

vi.mock('./OrderDialog', () => ({
  default: (props) => {
    mocks.orderDialogProps = props
    return null
  },
}))
vi.mock('./NewOrderDialog', () => ({
  default: (props) => {
    mocks.newOrderProps = props
    return null
  },
}))
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
    mocks.isMobile = false
    mocks.location = { state: null, search: '' }
    mocks.newOrderProps = null
    mocks.receiptProps = null
    mocks.orderDialogProps = null
    mocks.routedOrderProps = null
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
    mocks.useRoutedOrder.mockReset()
    mocks.useRoutedOrder.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
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

  it('mounts the new-order dialog while closed for pending-order recovery', () => {
    render(<Calendar />)

    expect(mocks.newOrderProps).toMatchObject({ open: false })

    mocks.calendarProps.customButtons.createOrderButton.click()

    expect(mocks.newOrderProps).toMatchObject({ open: true })
  })

  it('does not install mobile swipe handlers on desktop', () => {
    const addEventListener = vi.spyOn(HTMLElement.prototype, 'addEventListener')

    try {
      render(<Calendar />)

      const calendarElement = document.querySelector('.calendar')
      const swipeCalls = addEventListener.mock.calls.filter(([type], index) =>
        (type === 'touchstart' || type === 'touchend') &&
        addEventListener.mock.contexts[index] === calendarElement,
      )

      expect(swipeCalls).toHaveLength(0)
    } finally {
      addEventListener.mockRestore()
    }
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

  it('uses the service color when an order event color is automatic', () => {
    mocks.useCalendarOrders.mockReturnValue({
      data: [
        {
          id: 'automatic-color-order',
          date: '2026-01-15T07:00:00.000Z',
          duration: 2,
          service: { id: '1', name: 'Pakettiauto ja kuljettaja', eventColor: '1' },
          address: { street: 'Mannerheimintie 10' },
          name: 'Automatic Color Customer',
          confirmed: true,
          eventColor: null,
        },
      ],
      refetch: vi.fn(),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })

    render(<Calendar />)

    expect(mocks.calendarProps.events[0]).toMatchObject({
      backgroundColor: '#7986cb',
      borderColor: '#7986cb',
      extendedProps: { color: '#7986cb', eventType: 'order' },
    })
  })

  it('routes directly to the receipt page by order ID', () => {
    const orderId = '66c000000000000000000001'
    mocks.location = {
      pathname: '/calendar/receipt/order-1',
      state: null,
      search: '',
      hash: '',
    }
    mocks.routeMatches['/calendar/receipt/:orderId'] = { params: { orderId } }

    render(<Calendar />)

    expect(screen.getByTestId('receipt-page')).toBeInTheDocument()
    expect(mocks.receiptProps).toEqual({ orderId })
    expect(mocks.history.replace).not.toHaveBeenCalled()
  })

  it('uses the exact routed order and refreshes both queries after a mutation', async () => {
    const calendarRefetch = vi.fn().mockResolvedValue({})
    const routedRefetch = vi.fn().mockResolvedValue({})
    const routedOrder = { id: 'order-1', name: 'Routed Customer' }

    mocks.useCalendarOrders.mockReturnValue({
      data: [],
      refetch: calendarRefetch,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })
    mocks.useRoutedOrder.mockReturnValue({
      data: routedOrder,
      isLoading: false,
      isError: false,
      error: null,
      refetch: routedRefetch,
    })
    mocks.routeMatches['/calendar/order/:orderId'] = { params: { orderId: 'order-1' } }

    render(<Calendar />)

    expect(mocks.routedOrderProps).toBe('order-1')
    expect(mocks.orderDialogProps).toMatchObject({
      eventId: 'order-1',
      order: routedOrder,
      loading: false,
      notFound: false,
    })

    await mocks.orderDialogProps.onOrderUpdate()

    expect(calendarRefetch).toHaveBeenCalledTimes(1)
    expect(routedRefetch).toHaveBeenCalledTimes(1)
  })

  it('passes a 404 routed order state without enabling order actions', () => {
    mocks.routeMatches['/calendar/order/:orderId'] = { params: { orderId: 'missing-order' } }
    mocks.useRoutedOrder.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { response: { status: 404 } },
      refetch: vi.fn(),
    })

    render(<Calendar />)

    expect(mocks.orderDialogProps).toMatchObject({
      eventId: 'missing-order',
      order: null,
      loading: false,
      notFound: true,
    })
  })
})
