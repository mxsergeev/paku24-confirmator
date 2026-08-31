// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCanonicalAppOrder } from '../../shared/testFixtures/orderFixtures'

const mocks = vi.hoisted(() => ({
  ordersAPI: {
    add: vi.fn(),
    confirm: vi.fn(),
    getById: vi.fn(),
  },
  enqueueSnackbar: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}))

vi.mock('@material-ui/core', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Dialog: ({ children, open }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  IconButton: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

vi.mock('@material-ui/core/useMediaQuery', () => ({
  default: () => false,
}))

vi.mock('@material-ui/icons/Close', () => ({ default: () => null }))
vi.mock('@material-ui/icons/NoteAdd', () => ({ default: () => null }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

vi.mock('../../services/ordersAPI', () => ({
  default: mocks.ordersAPI,
}))

vi.mock('../OrderEditor/OrderEditor', () => ({
  default: ({ order }) => <div data-testid="order-editor">{order?.name}</div>,
}))
vi.mock('../OrderEditor/OrderSettings', () => ({ default: () => null }))
vi.mock('../OrderEditor/ValidationDisplay', () => ({ default: () => null }))

import NewOrderDialog from './NewOrderDialog'

const PENDING_ORDER_ID = '66c000000000000000000001'

function renderDialog() {
  return render(<NewOrderDialog open onClose={vi.fn()} onOrderCreated={vi.fn()} />)
}

describe('NewOrderDialog persistence workflow', () => {
  beforeEach(() => {
    window.localStorage.clear()
    mocks.ordersAPI.add.mockReset()
    mocks.ordersAPI.confirm.mockReset()
    mocks.ordersAPI.getById.mockReset()
    mocks.enqueueSnackbar.mockReset()
    mocks.queryClient.invalidateQueries.mockReset()
  })

  it('fetches a pending order after reload and retries confirmation without adding another order', async () => {
    const recoveredOrder = {
      ...makeCanonicalAppOrder({ name: 'Recovered order' }),
      id: PENDING_ORDER_ID,
    }
    window.localStorage.setItem('pending_new_order_id', PENDING_ORDER_ID)
    mocks.ordersAPI.getById.mockResolvedValue({ order: recoveredOrder })
    mocks.ordersAPI.confirm
      .mockRejectedValueOnce(new Error('temporary calendar failure'))
      .mockResolvedValueOnce({ message: 'Order confirmed' })

    renderDialog()

    expect(screen.getByRole('button', { name: /recovering order/i })).toBeDisabled()
    await waitFor(() => expect(mocks.ordersAPI.getById).toHaveBeenCalledWith(PENDING_ORDER_ID))
    expect(screen.getByTestId('order-editor')).toHaveTextContent('Recovered order')

    const retryButton = screen.getByRole('button', { name: /retry confirmation/i })
    expect(retryButton).not.toBeDisabled()
    fireEvent.click(retryButton)
    await waitFor(() => expect(mocks.ordersAPI.confirm).toHaveBeenCalledTimes(1))

    expect(mocks.ordersAPI.add).not.toHaveBeenCalled()
    fireEvent.click(retryButton)
    await waitFor(() => expect(mocks.ordersAPI.confirm).toHaveBeenCalledTimes(2))

    expect(mocks.ordersAPI.confirm).toHaveBeenNthCalledWith(1, PENDING_ORDER_ID)
    expect(mocks.ordersAPI.confirm).toHaveBeenNthCalledWith(2, PENDING_ORDER_ID)
    await waitFor(() => {
      expect(window.localStorage.getItem('pending_new_order_id')).toBeNull()
      expect(window.localStorage.getItem('new_order')).toBeNull()
    })
  })

  it('clears the draft after a new order is persisted and confirmed', async () => {
    mocks.ordersAPI.add.mockResolvedValue({ id: PENDING_ORDER_ID })
    mocks.ordersAPI.confirm.mockResolvedValue({ message: 'Order confirmed' })

    renderDialog()
    await waitFor(() => expect(window.localStorage.getItem('new_order')).not.toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /add order/i }))

    await waitFor(() => {
      expect(mocks.ordersAPI.add).toHaveBeenCalledTimes(1)
      expect(mocks.ordersAPI.confirm).toHaveBeenCalledWith(PENDING_ORDER_ID)
      expect(window.localStorage.getItem('new_order')).toBeNull()
      expect(window.localStorage.getItem('pending_new_order_id')).toBeNull()
    })
  })
})
