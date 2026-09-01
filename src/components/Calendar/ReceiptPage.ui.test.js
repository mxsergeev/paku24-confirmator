// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCanonicalAppOrder } from '../../shared/testFixtures/orderFixtures'

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  sendReceiptEmail: vi.fn(),
  jsPdf: vi.fn(),
  html: vi.fn(),
  output: vi.fn(),
  save: vi.fn(),
  enqueueSnackbar: vi.fn(),
}))

vi.mock('@material-ui/core', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  CircularProgress: (props) => <span data-size={props.size}>Loading</span>,
}))

vi.mock('../../services/ordersAPI', () => ({
  default: { getById: mocks.getById },
}))

vi.mock('../../services/emailAPI', () => ({
  sendReceiptEmail: mocks.sendReceiptEmail,
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: mocks.enqueueSnackbar,
}))

vi.mock('jspdf', () => ({
  jsPDF: mocks.jsPdf,
}))

import ReceiptPage from './ReceiptPage'

describe('ReceiptPage document actions', () => {
  beforeEach(() => {
    const pdf = {
      html: mocks.html,
      output: mocks.output,
      save: mocks.save,
    }

    mocks.getById.mockReset()
    mocks.getById.mockResolvedValue({ order: makeCanonicalAppOrder() })
    mocks.sendReceiptEmail.mockReset()
    mocks.sendReceiptEmail.mockResolvedValue({ message: 'Document sent.' })
    mocks.jsPdf.mockReset()
    mocks.jsPdf.mockReturnValue(pdf)
    mocks.html.mockReset()
    mocks.html.mockImplementation((_page, options) => options.callback())
    mocks.output.mockReset()
    mocks.output.mockReturnValue('data:application/pdf;base64,ZmFrZQ==')
    mocks.save.mockReset()
    mocks.enqueueSnackbar.mockReset()
    window.localStorage.clear()
  })

  it('sends an invoice with invoice-specific metadata', async () => {
    window.localStorage.setItem(
      'receipt-draft:order-1',
      JSON.stringify({ documentType: 'invoice' }),
    )
    render(<ReceiptPage orderId="order-1" />)

    await screen.findByText('LASKU')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(mocks.sendReceiptEmail).toHaveBeenCalledTimes(1))
    expect(mocks.sendReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'invoice',
        fileName: expect.stringMatching(/^invoice-.*\.pdf$/),
        subject: expect.stringMatching(/^Invoice/),
        body: 'Please find your invoice attached.',
      }),
    )
  })

  it('sends and downloads a receipt with receipt-specific names', async () => {
    window.localStorage.setItem(
      'receipt-draft:order-1',
      JSON.stringify({ documentType: 'receipt' }),
    )
    render(<ReceiptPage orderId="order-1" />)

    await screen.findByText('KUITTI')
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save).toHaveBeenCalledWith(expect.stringMatching(/^Receipt .*\.pdf$/))
    await waitFor(() => expect(mocks.sendReceiptEmail).toHaveBeenCalledTimes(1))
    expect(mocks.sendReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'receipt',
        fileName: expect.stringMatching(/^receipt-.*\.pdf$/),
        subject: expect.stringMatching(/^Receipt/),
        body: 'Please find your receipt attached.',
      }),
    )
    expect(window.localStorage.getItem('receipt-draft:order-1')).toBeNull()
  })
})
