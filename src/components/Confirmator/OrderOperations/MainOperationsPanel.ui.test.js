// @vitest-environment jsdom

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  addOrderToCalendar: vi.fn(),
  enqueueSnackbar: vi.fn(),
}))

vi.mock('../../../services/orderCalendarWorkflow', () => ({
  default: mocks.addOrderToCalendar,
}))
vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))
vi.mock('../NewOrderButton', () => ({
  default: ({ handleClick, text, disabled }) => (
    <button onClick={handleClick} disabled={disabled}>
      {text}
    </button>
  ),
}))
vi.mock('../OrderPool/OrderPoolOpenerButton', () => ({ default: () => null }))
vi.mock('./MessageBeforeButton', () => ({ default: () => null }))
vi.mock('./ConfirmationEmailSenderButton', () => ({ default: () => null }))
vi.mock('./ConfirmationSMSSenderButton', () => ({ default: () => null }))
vi.mock('./AddOrderToCalendarButton', () => ({ default: () => null }))

import MainOperationsPanel from './MainOperationsPanel'

function makeOrder() {
  return {
    id: 'order-1',
    confirmed: true,
    deletedAt: null,
    email: 'customer@example.com',
    phone: '+358401234567',
  }
}

describe('MainOperationsPanel calendar warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the persisted-order action retryable after a calendar warning', async () => {
    mocks.addOrderToCalendar.mockResolvedValue({
      message: 'Order updated',
      warning: {
        code: 'CALENDAR_SYNC_FAILED',
        message: 'Calendar unavailable',
      },
    })
    const handleResetClick = vi.fn()

    render(
      <MainOperationsPanel
        order={makeOrder()}
        orderId="order-1"
        transformedOrder={{ text: 'order text' }}
        handleResetClick={handleResetClick}
        hideOrderPool
      />,
    )

    const addButton = screen.getByRole('button', { name: 'Add order' })
    fireEvent.click(addButton)

    await waitFor(() => expect(mocks.addOrderToCalendar).toHaveBeenCalledTimes(1))
    expect(handleResetClick).not.toHaveBeenCalled()
    expect(addButton).not.toBeDisabled()
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Calendar unavailable', { variant: 'warning' })

    fireEvent.click(addButton)
    await waitFor(() => expect(mocks.addOrderToCalendar).toHaveBeenCalledTimes(2))
  })
})
