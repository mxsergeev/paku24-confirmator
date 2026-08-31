import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.hoisted(() => vi.fn())

vi.mock('./interceptor', () => ({
  default: {
    axiosInstance: { post },
  },
}))

import calendarAPI, { syncOrder } from './calendarAPI'

describe('calendarAPI.syncOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    post.mockResolvedValue({ data: { message: 'Added' } })
  })

  it('sends only the persisted order ID to the calendar endpoint', async () => {
    await expect(calendarAPI.syncOrder('order-1')).resolves.toEqual({ message: 'Added' })

    expect(post).toHaveBeenCalledWith('/api/calendar', { orderId: 'order-1' })
  })

  it('exposes the sync operation as a named export', async () => {
    await syncOrder('order-2')

    expect(post).toHaveBeenCalledWith('/api/calendar', { orderId: 'order-2' })
  })

  it('rejects missing order IDs before making a request', async () => {
    await expect(calendarAPI.syncOrder()).rejects.toThrow('Order ID is required')

    expect(post).not.toHaveBeenCalled()
  })
})
