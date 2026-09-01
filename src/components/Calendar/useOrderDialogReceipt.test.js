// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserHistory } from 'history'
import { makeCanonicalAppOrder } from '../../shared/testFixtures/orderFixtures'
import { makeReceiptDraftStorageKey } from './receiptData.helpers'
import useOrderDialogReceipt from './useOrderDialogReceipt'

const mocks = vi.hoisted(() => ({
  history: {
    createHref: vi.fn(({ pathname, search = '' }) => `/app${pathname}${search}`),
  },
  openedWindow: {},
  open: vi.fn(),
  enqueueSnackbar: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useHistory: () => mocks.history,
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

function ReceiptHookHarness({ order, orderId }) {
  const receipt = useOrderDialogReceipt({ order, orderId })

  return (
    <>
      <button type="button" onClick={() => receipt.handleReceiptOpen('invoice')}>
        Prepare invoice
      </button>
      <button
        type="button"
        onClick={() => receipt.handleReceiptPageOpen({
          ...receipt.receiptDraft,
          customerName: 'Edited Customer',
        })}
      >
        Open invoice
      </button>
      <span data-testid="document-type">{receipt.receiptDocumentType}</span>
      <span data-testid="receipt-open">{String(receipt.receiptOpen)}</span>
    </>
  )
}

describe('receipt navigation', () => {
  const orderId = '66c000000000000000000001'

  beforeEach(() => {
    window.localStorage.clear()
    window.open = mocks.open
    window.history.replaceState({}, '', `/app/calendar/order/${orderId}`)
    const browserHistory = createBrowserHistory({ basename: '/app' })
    mocks.history.createHref.mockImplementation(browserHistory.createHref)
    mocks.history.createHref.mockClear()
    mocks.open.mockReset()
    mocks.open.mockReturnValue(mocks.openedWindow)
    mocks.enqueueSnackbar.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the router basename and checkpoints edited invoice data for the new tab', () => {
    render(<ReceiptHookHarness order={makeCanonicalAppOrder()} orderId={orderId} />)

    fireEvent.click(screen.getByRole('button', { name: 'Prepare invoice' }))
    expect(screen.getByTestId('document-type')).toHaveTextContent('invoice')
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }))

    expect(mocks.history.createHref).toHaveBeenCalledWith({
      pathname: `/calendar/receipt/${orderId}`,
      search: expect.stringMatching(/^\?receiptDraftKey=/),
    })
    expect(mocks.open).toHaveBeenCalledTimes(1)

    const [receiptUrl] = mocks.open.mock.calls[0]
    const parsedUrl = new URL(receiptUrl, 'http://localhost')
    expect(parsedUrl.pathname).toBe(`/app/calendar/receipt/${orderId}`)

    const draftKey = parsedUrl.searchParams.get('receiptDraftKey')
    expect(draftKey).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(makeReceiptDraftStorageKey(draftKey)))).toMatchObject({
      documentType: 'invoice',
      receiptDraft: { customerName: 'Edited Customer' },
    })
    expect(mocks.openedWindow).not.toHaveProperty('state')
  })

  it('keeps the edit dialog open when the draft checkpoint cannot be saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    render(<ReceiptHookHarness order={makeCanonicalAppOrder()} orderId={orderId} />)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare invoice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }))

    expect(screen.getByTestId('receipt-open')).toHaveTextContent('true')
    expect(mocks.open).not.toHaveBeenCalled()
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
      'Could not save receipt details for the new tab. Please try again.',
      { variant: 'error' },
    )
  })

  it('keeps the edit dialog open when the new tab is blocked', () => {
    mocks.open.mockReturnValue(null)

    render(<ReceiptHookHarness order={makeCanonicalAppOrder()} orderId={orderId} />)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare invoice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }))

    expect(screen.getByTestId('receipt-open')).toHaveTextContent('true')
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
      'Failed to open new tab. Please check your browser settings.',
      { variant: 'error' },
    )
    const [receiptUrl] = mocks.open.mock.calls[0]
    const draftKey = new URL(receiptUrl, 'http://localhost').searchParams.get('receiptDraftKey')
    expect(window.localStorage.getItem(makeReceiptDraftStorageKey(draftKey))).toBeNull()
  })

  it('cleans up and warns when opening the new tab throws', () => {
    mocks.open.mockImplementation(() => {
      throw new Error('popup failed')
    })

    render(<ReceiptHookHarness order={makeCanonicalAppOrder()} orderId={orderId} />)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare invoice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open invoice' }))

    expect(screen.getByTestId('receipt-open')).toHaveTextContent('true')
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
      'Failed to open new tab. Please check your browser settings.',
      { variant: 'error' },
    )
    expect(
      Object.keys(window.localStorage).filter((key) => key.startsWith('paku24-receipt-draft:')),
    ).toEqual([])
  })
})
