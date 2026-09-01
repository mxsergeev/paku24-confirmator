// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  history: {
    location: {
      state: {
        referrer: {
          pathname: '/calendar/receipt/order-1',
          search: '?receiptDraftKey=draft-1',
          hash: '',
        },
      },
    },
    push: vi.fn(),
  },
  loginWithCredentials: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children }) => <a href="/register">{children}</a>,
  useHistory: () => mocks.history,
}))

vi.mock('@material-ui/core', () => ({
  useMediaQuery: () => false,
}))

vi.mock('@material-ui/core/TextField', () => ({
  default: ({ label, error: _error, ...props }) => (
    <label>
      {label}
      <input {...props} />
    </label>
  ),
}))

vi.mock('@material-ui/core/Button', () => ({
  default: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

vi.mock('../services/login', () => ({
  default: { loginWithCredentials: mocks.loginWithCredentials },
}))

vi.mock('./Notification', () => ({ default: () => null }))

import Login from './Login'

describe('Login redirect', () => {
  beforeEach(() => {
    mocks.history.push.mockReset()
    mocks.loginWithCredentials.mockReset()
    mocks.loginWithCredentials.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('preserves receipt query state after manual login', async () => {
    render(<Login updateUser={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(mocks.history.push).toHaveBeenCalledWith({
      pathname: '/calendar/receipt/order-1',
      search: '?receiptDraftKey=draft-1',
      hash: '',
    }))
  })
})
