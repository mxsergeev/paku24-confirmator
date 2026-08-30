// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Confirmator from './Confirmator'

const mocks = vi.hoisted(() => ({
  params: { id: '66c000000000000000000001' },
  getOrderById: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => mocks.params,
}))

vi.mock('../../services/orderPoolAPI', () => ({
  default: {
    getOrderById: mocks.getOrderById,
  },
}))

vi.mock('./Editor', () => ({
  default: () => <div data-testid="editor" />,
}))
vi.mock('./OrderSettings', () => ({ default: () => null }))
vi.mock('./ValidationDisplay', () => ({ default: () => null }))
vi.mock('./OrderContainers/TransformedOrderContainer', () => ({ default: () => null }))
vi.mock('./OrderOperations/TransformPanel', () => ({ default: () => null }))
vi.mock('./OrderOperations/MainOperationsPanel', () => ({ default: () => null }))
vi.mock('./OrderPool/OrderPoolDialog', () => ({ default: () => null }))

describe('Confirmator explicit order loading', () => {
  it('shows loading and not-found states without rendering or overwriting a draft', async () => {
    const draft = '{"draft":"keep"}'
    window.localStorage.setItem('confirmator_order', draft)

    let rejectRequest
    mocks.getOrderById.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject
        }),
    )

    render(<Confirmator />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading order...')
    expect(screen.queryByTestId('editor')).not.toBeInTheDocument()
    expect(mocks.getOrderById).toHaveBeenCalledWith(mocks.params.id)

    rejectRequest({ response: { status: 404 } })

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Order not found.'))
    expect(screen.queryByTestId('editor')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('confirmator_order')).toBe(draft)
  })
})
