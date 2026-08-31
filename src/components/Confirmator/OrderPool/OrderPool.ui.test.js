// @vitest-environment jsdom

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@material-ui/core/Button', () => ({
  default: ({ children, ...props }) => React.createElement('button', props, children),
}))
vi.mock('@material-ui/core/IconButton', () => ({
  default: ({ children, ...props }) => React.createElement('button', props, children),
}))
vi.mock('@material-ui/core/TextField', () => ({
  default: ({ value, onChange, ...props }) =>
    React.createElement('input', { ...props, value, onChange }),
}))
vi.mock('@material-ui/icons/Refresh', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Delete', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Restore', () => ({ default: () => null }))

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  remove: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('../../../services/orderPoolAPI', () => ({
  default: {
    get: mocks.get,
    remove: mocks.remove,
    retrieve: mocks.retrieve,
  },
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}))

import OrderPool from './OrderPool'

function makeOrder(overrides = {}) {
  return {
    id: 'order-1',
    date: '2026-08-30T10:00:00.000Z',
    confirmed: false,
    confirmedAt: null,
    name: 'Alpha Customer',
    email: 'alpha@example.com',
    phone: '+358401234567',
    comment: 'Please call before arrival.',
    service: { name: 'Fragile Move', pricePerHour: 50 },
    paymentType: { name: 'Mobile Pay' },
    address: {
      street: 'Start Search Street 1',
      index: '00100',
      city: 'Helsinki',
      floor: 2,
      elevator: true,
    },
    extraAddresses: [
      {
        street: 'Extra Search Street 2',
        index: '00200',
        city: 'Espoo',
        floor: 1,
        elevator: false,
      },
    ],
    destination: {
      street: 'Destination Search Street 3',
      index: '00300',
      city: 'Vantaa',
      floor: 3,
      elevator: false,
    },
    duration: 2,
    boxes: { amount: 0 },
    fees: [],
    price: 100,
    boxesPrice: 0,
    ...overrides,
  }
}

function renderOrderPool(orders) {
  mocks.get.mockResolvedValue(orders)
  return render(<OrderPool handleExport={vi.fn()} />)
}

describe('OrderPool filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('searches every supported customer, booking, and address field without fetching', async () => {
    const order = makeOrder()
    renderOrderPool([order])

    await waitFor(() => expect(screen.getByText(/Alpha Customer/)).toBeInTheDocument())
    expect(mocks.get).toHaveBeenCalledTimes(1)

    const input = screen.getByRole('textbox')
    const searchCases = [
      'alpha customer',
      'ALPHA@EXAMPLE.COM',
      '+358401234567',
      'fragile move',
      'mobile pay',
      'start search street',
      'extra search street',
      'destination search street',
      'please call before arrival',
    ]

    searchCases.forEach((searchText) => {
      fireEvent.change(input, { target: { value: `  ${searchText}  ` } })
      expect(screen.getByText(/Alpha Customer/)).toBeInTheDocument()
    })

    expect(mocks.get).toHaveBeenCalledTimes(1)
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText(/Alpha Customer/)).toBeInTheDocument()
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  it('composes search with the unconfirmed filter using confirmed as the source of truth', async () => {
    const unconfirmedWithMetadata = makeOrder({
      id: 'order-unconfirmed',
      name: 'Unconfirmed With Metadata',
      comment: 'Metadata-only comment',
      confirmed: false,
      confirmedAt: '2026-08-30T12:00:00.000Z',
    })
    const confirmedWithoutMetadata = makeOrder({
      id: 'order-confirmed',
      name: 'Confirmed Without Metadata',
      confirmed: true,
      confirmedAt: null,
    })
    renderOrderPool([unconfirmedWithMetadata, confirmedWithoutMetadata])

    await waitFor(() => expect(screen.getByText(/Unconfirmed With Metadata/)).toBeInTheDocument())
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'metadata-only' } })
    expect(screen.getByText(/Unconfirmed With Metadata/)).toBeInTheDocument()
    expect(screen.queryByText(/Confirmed Without Metadata/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /❕/ }))
    expect(screen.getByText(/Unconfirmed With Metadata/)).toBeInTheDocument()
    expect(screen.queryByText(/Confirmed Without Metadata/)).not.toBeInTheDocument()
  })

  it('refreshes exactly once per click and loads more pages without losing filters', async () => {
    const firstPageOrder = makeOrder({ id: 'order-first', name: 'Keep this order' })
    const secondPageOrder = makeOrder({
      id: 'order-second',
      name: 'Keep this second order',
      comment: 'Loaded from the next page.',
    })
    mocks.get.mockImplementation((pages) =>
      Promise.resolve(pages.includes(2) ? [firstPageOrder, secondPageOrder] : [firstPageOrder])
    )
    render(<OrderPool handleExport={vi.fn()} />)

    await waitFor(() => expect(screen.getByText(/Keep this order/)).toBeInTheDocument())
    const initialCallCount = mocks.get.mock.calls.length
    fireEvent.click(screen.getAllByRole('button')[2])
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(initialCallCount + 1))

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(screen.getByText(/Keep this second order/)).toBeInTheDocument())
    expect(mocks.get).toHaveBeenCalledTimes(initialCallCount + 2)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'second' } })
    expect(screen.getByText(/Keep this second order/)).toBeInTheDocument()
    expect(screen.queryByText(/^name: Keep this order$/)).not.toBeInTheDocument()
  })
})
