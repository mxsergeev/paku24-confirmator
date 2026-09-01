// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  loginWithAccessToken: vi.fn(),
  loginWithCredentials: vi.fn(),
  setupInterceptor: vi.fn(),
}))

vi.mock('./services/login', () => ({
  default: {
    loginWithAccessToken: mocks.loginWithAccessToken,
    loginWithCredentials: mocks.loginWithCredentials,
  },
}))

vi.mock('./services/interceptor', () => ({
  default: { setupInterceptor: mocks.setupInterceptor },
}))

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}))

vi.mock('./components/Header', () => ({ default: () => null }))
vi.mock('./components/Register', () => ({ default: () => null }))
vi.mock('./components/Statistics/Statistics', () => ({ default: () => null }))
vi.mock('./components/Footer', () => ({ default: () => null }))
vi.mock('./components/Calendar/Calendar', () => ({
  default: () => {
    const location = useLocation()
    return (
      <div data-testid="calendar-location">
        {location.pathname}{location.search}{location.hash}
      </div>
    )
  },
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

vi.mock('./components/Notification', () => ({ default: () => null }))

import App from './App'

describe('App calendar routes', () => {
  beforeEach(() => {
    mocks.loginWithAccessToken.mockReset()
    mocks.loginWithCredentials.mockReset()
    mocks.setupInterceptor.mockReset()
    mocks.loginWithAccessToken.mockResolvedValue({ user: { id: 'user-1' } })
    mocks.loginWithCredentials.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('mounts Calendar for receipt routes', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar/receipt/order-1']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('calendar-location')).toHaveTextContent(
        '/calendar/receipt/order-1',
      )
    })
  })

  it('opens Calendar from the root route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('calendar-location')).toHaveTextContent('/calendar')
    })
  })

  it('returns to the protected receipt route after manual login', async () => {
    mocks.loginWithAccessToken.mockRejectedValue(new Error('no token'))

    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/calendar/receipt/order-1',
          search: '',
          hash: '#invoice',
        }]}
      >
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('Username'), {
      target: { value: 'user' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByTestId('calendar-location')).toHaveTextContent(
        '/calendar/receipt/order-1#invoice',
      )
    })
  })
})
