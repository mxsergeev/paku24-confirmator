import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const { calendarDelete } = vi.hoisted(() => ({ calendarDelete: vi.fn() }))

vi.mock('../modules/calendar/calendar.helpers.js', () => ({
  getCalendar: vi.fn(async () => ({ events: { delete: calendarDelete } })),
}))

describe('deleteEventFromCalendar', () => {
  let deleteEventFromCalendar

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    calendarDelete.mockReset()
    ;({ deleteEventFromCalendar } = await import('../modules/calendar/calendar.googleAPI.js'))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('propagates Google Calendar deletion failures', async () => {
    const failure = new Error('calendar unavailable')
    calendarDelete.mockRejectedValue(failure)

    await expect(deleteEventFromCalendar('event-id')).rejects.toBe(failure)
    expect(calendarDelete).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event-id',
    })
  })
})
