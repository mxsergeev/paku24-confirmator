// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Confirmator from './Confirmator'
import { createAppOrder } from '../../shared/orderModel'

const mocks = vi.hoisted(() => ({
  params: { id: '66c000000000000000000001' },
  getOrderById: vi.fn(),
  history: { replace: vi.fn() },
  onOrderPersisted: null,
  onOrderUpdated: null,
}))

vi.mock('react-router-dom', () => ({
  useParams: () => mocks.params,
  useLocation: () => ({
    pathname: mocks.params.id ? `/confirmator/${mocks.params.id}` : '/confirmator',
  }),
  useHistory: () => mocks.history,
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
vi.mock('./OrderOperations/MainOperationsPanel', () => ({
  default: ({ onOrderPersisted, onOrderUpdated }) => {
    mocks.onOrderPersisted = onOrderPersisted
    mocks.onOrderUpdated = onOrderUpdated
    return (
      <button onClick={() => onOrderPersisted?.('66c000000000000000000002')}>persist order</button>
    )
  },
}))
vi.mock('./OrderPool/OrderPoolDialog', () => ({ default: () => null }))

describe('Confirmator explicit order loading', () => {
  afterEach(() => {
    mocks.params.id = '66c000000000000000000001'
    mocks.history.replace.mockReset()
    mocks.getOrderById.mockReset()
    mocks.onOrderPersisted = null
    mocks.onOrderUpdated = null
    window.localStorage.clear()
  })

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

  it('leaves draft mode after persistence and navigates to the saved order', async () => {
    mocks.params.id = undefined
    render(<Confirmator />)

    await waitFor(() => expect(window.localStorage.getItem('confirmator_order')).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'persist order' }))

    expect(window.localStorage.getItem('confirmator_order')).toBeNull()
    expect(mocks.history.replace).toHaveBeenCalledWith('/confirmator/66c000000000000000000002')
  })

  it('allows a persisted update callback to finish a route transition', async () => {
    mocks.params.id = undefined
    const view = render(<Confirmator />)
    const workflowToken = {}
    mocks.onOrderPersisted('66c000000000000000000002', workflowToken)
    mocks.getOrderById.mockReturnValue(new Promise(() => {}))

    mocks.params.id = '66c000000000000000000002'
    view.rerender(<Confirmator />)
    mocks.onOrderUpdated({ ...createAppOrder(), id: mocks.params.id }, workflowToken)

    await waitFor(() => expect(screen.getByTestId('editor')).toBeInTheDocument())
  })

  it('allows a persisted update callback to recover after a route load error', async () => {
    mocks.params.id = undefined
    const view = render(<Confirmator />)
    const workflowToken = {}
    mocks.onOrderPersisted('66c000000000000000000002', workflowToken)
    mocks.getOrderById.mockRejectedValueOnce(new Error('temporary load failure'))

    mocks.params.id = '66c000000000000000000002'
    view.rerender(<Confirmator />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load order.'))

    mocks.onOrderUpdated({ ...createAppOrder(), id: mocks.params.id }, workflowToken)

    await waitFor(() => expect(screen.getByTestId('editor')).toBeInTheDocument())
  })
})
