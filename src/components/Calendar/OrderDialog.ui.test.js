// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCanonicalAppOrder } from '../../shared/testFixtures/orderFixtures'

const mocks = vi.hoisted(() => ({
  ordersAPI: {
    update: vi.fn(),
  },
  enqueueSnackbar: vi.fn(),
  history: {
    createHref: vi.fn(({ pathname }) => pathname),
  },
}))

vi.mock('@material-ui/core', () => ({
  Button: ({ children, startIcon: _startIcon, ...props }) => <button {...props}>{children}</button>,
  Dialog: ({ children, open }) => (open ? <div role="dialog">{children}</div> : null),
  DialogActions: ({ children }) => <div>{children}</div>,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <div>{children}</div>,
  IconButton: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

vi.mock('@material-ui/core/useMediaQuery', () => ({
  default: () => false,
}))

vi.mock('@material-ui/icons/Close', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Email', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Textsms', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Edit', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Delete', () => ({ default: () => null }))
vi.mock('@material-ui/icons/Check', () => ({ default: () => null }))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

vi.mock('react-router-dom', () => ({
  useHistory: () => mocks.history,
}))

vi.mock('../../services/ordersAPI', () => ({
  default: mocks.ordersAPI,
}))

vi.mock('../../services/emailAPI', () => ({
  default: vi.fn(),
  sendCancellationEmail: vi.fn(),
}))

vi.mock('../../services/smsAPI', () => ({
  default: vi.fn(),
  sendCancellationSMS: vi.fn(),
}))

vi.mock('./OrderDialogDetails', () => ({
  default: ({ onEventColorChange }) => (
    <button
      type="button"
      onClick={() => onEventColorChange('eventColor', '11')}
    >
      Change event color
    </button>
  ),
}))

vi.mock('./ReceiptEditDialog', () => ({ default: () => null }))
vi.mock('./EditOrderDialog', () => ({ default: () => null }))
vi.mock('./DeleteOrderDialog', () => ({ default: () => null }))
vi.mock('./CancelOrderDialog', () => ({ default: () => null }))

import OrderDialog from './OrderDialog'

function renderDialog(onOrderUpdate = vi.fn()) {
  const order = makeCanonicalAppOrder({
    id: 'order-1',
    confirmed: true,
  })

  return render(
    <OrderDialog
      onClose={vi.fn()}
      eventId="order-1"
      order={order}
      onOrderUpdate={onOrderUpdate}
    />,
  )
}

describe('OrderDialog event color updates', () => {
  beforeEach(() => {
    mocks.ordersAPI.update.mockReset()
    mocks.enqueueSnackbar.mockReset()
    mocks.history.createHref.mockClear()
  })

  it('renders without crashing', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change event color' })).toBeInTheDocument()
  })

  it('updates the order normally and refreshes after a successful response', async () => {
    const onOrderUpdate = vi.fn()
    let resolveUpdate
    mocks.ordersAPI.update.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve
      }),
    )

    renderDialog(onOrderUpdate)
    fireEvent.click(screen.getByRole('button', { name: 'Change event color' }))

    await waitFor(() =>
      expect(mocks.ordersAPI.update).toHaveBeenCalledWith('order-1', { eventColor: '11' }),
    )
    expect(onOrderUpdate).not.toHaveBeenCalled()

    resolveUpdate({ message: 'Event color updated.' })

    await waitFor(() => expect(onOrderUpdate).toHaveBeenCalledTimes(1))
    expect(mocks.ordersAPI.update.mock.invocationCallOrder[0]).toBeLessThan(
      onOrderUpdate.mock.invocationCallOrder[0],
    )
  })
})
