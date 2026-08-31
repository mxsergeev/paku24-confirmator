import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  makeGoogleEventObjects: vi.fn(),
  addEventToCalendar: vi.fn(),
  updateEventInCalendar: vi.fn(),
  deleteEventFromCalendar: vi.fn(),
  updateOne: vi.fn(),
}))

vi.mock('../models/order.js', () => ({
  default: { updateOne: mocks.updateOne },
}))

vi.mock('../modules/calendar/calendar.helpers.js', () => ({
  makeGoogleEventObjects: mocks.makeGoogleEventObjects,
}))

vi.mock('../modules/calendar/calendar.googleAPI.js', () => ({
  addEventToCalendar: mocks.addEventToCalendar,
  updateEventInCalendar: mocks.updateEventInCalendar,
  deleteEventFromCalendar: mocks.deleteEventFromCalendar,
}))

const { deleteOrderEvent, syncOrderToCalendar } = await import('../modules/calendar/calendar.sync.js')

const eventsWithBoxes = [
  { role: 'main', summary: 'move' },
  { role: 'boxDelivery', summary: 'delivery' },
  { role: 'boxReturn', summary: 'return' },
]

describe('calendar reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.makeGoogleEventObjects.mockReturnValue(eventsWithBoxes)
    mocks.addEventToCalendar.mockImplementation(async (event) => ({
      data: { id: `${event.summary}-created` },
    }))
    mocks.updateEventInCalendar.mockImplementation(async (eventId) => ({
      data: { id: eventId },
    }))
    mocks.deleteEventFromCalendar.mockResolvedValue(undefined)
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 })
  })

  it('updates all role-specific IDs without creating duplicate events', async () => {
    const order = {
      _id: 'order-1',
      calendarEventIds: {
        main: 'main-existing',
        boxDelivery: 'delivery-existing',
        boxReturn: 'return-existing',
      },
    }

    const result = await syncOrderToCalendar(order)

    expect(mocks.updateEventInCalendar).toHaveBeenCalledTimes(3)
    expect(mocks.updateEventInCalendar).toHaveBeenNthCalledWith(1, 'main-existing', {
      summary: 'move',
    })
    expect(mocks.updateEventInCalendar).toHaveBeenNthCalledWith(2, 'delivery-existing', {
      summary: 'delivery',
    })
    expect(mocks.updateEventInCalendar).toHaveBeenNthCalledWith(3, 'return-existing', {
      summary: 'return',
    })
    expect(mocks.addEventToCalendar).not.toHaveBeenCalled()
    expect(mocks.deleteEventFromCalendar).not.toHaveBeenCalled()
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: 'order-1' },
      {
        $set: {
          calendarEventIds: {
            main: 'main-existing',
            boxDelivery: 'delivery-existing',
            boxReturn: 'return-existing',
          },
        },
      },
    )
    expect(result.calendarEventIds).toEqual(order.calendarEventIds)
  })

  it('deletes stale box events and persists the remaining IDs', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])

    await syncOrderToCalendar({
      _id: 'order-2',
      calendarEventIds: {
        main: 'main-existing',
        boxDelivery: 'delivery-stale',
        boxReturn: 'return-stale',
      },
    })

    expect(mocks.updateEventInCalendar).toHaveBeenCalledWith('main-existing', {
      summary: 'move',
    })
    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledWith('delivery-stale')
    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledWith('return-stale')
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: 'order-2' },
      { $set: { calendarEventIds: { main: 'main-existing', boxDelivery: null, boxReturn: null } } },
    )
  })

  it('rolls back events already created when a later create fails', async () => {
    const failure = new Error('delivery create failed')
    mocks.addEventToCalendar
      .mockResolvedValueOnce({ data: { id: 'main-created' } })
      .mockRejectedValueOnce(failure)

    await expect(
      syncOrderToCalendar({ _id: 'order-3', calendarEventIds: {} }),
    ).rejects.toBe(failure)

    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledWith('main-created')
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('surfaces a main create failure without attempting unrelated work', async () => {
    const failure = new Error('main create failed')
    mocks.addEventToCalendar.mockRejectedValue(failure)

    await expect(
      syncOrderToCalendar({ _id: 'order-main-failure', calendarEventIds: {} }),
    ).rejects.toBe(failure)

    expect(mocks.addEventToCalendar).toHaveBeenCalledTimes(1)
    expect(mocks.updateEventInCalendar).not.toHaveBeenCalled()
    expect(mocks.deleteEventFromCalendar).not.toHaveBeenCalled()
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('rejects a successful calendar create that does not return an ID', async () => {
    mocks.addEventToCalendar.mockResolvedValue({ data: {} })

    await expect(
      syncOrderToCalendar({ _id: 'order-missing-id', calendarEventIds: {} }),
    ).rejects.toThrow('no event ID for role main')

    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('rolls back every created event when linking IDs fails', async () => {
    const failure = new Error('link failed')
    mocks.updateOne.mockRejectedValue(failure)

    await expect(
      syncOrderToCalendar({ _id: 'order-4', calendarEventIds: {} }),
    ).rejects.toBe(failure)

    expect(mocks.deleteEventFromCalendar.mock.calls.map(([id]) => id)).toEqual([
      'return-created',
      'delivery-created',
      'move-created',
    ])
  })

  it('attempts every event deletion and skips DB writes for a removed order', async () => {
    const firstFailure = new Error('main delete failed')
    mocks.deleteEventFromCalendar
      .mockRejectedValueOnce(firstFailure)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    await expect(
      deleteOrderEvent({
        _id: 'already-deleted',
        calendarEventIds: {
          main: 'main-existing',
          boxDelivery: 'delivery-existing',
          boxReturn: 'return-existing',
        },
      }, { clearStoredIds: false }),
    ).rejects.toBe(firstFailure)

    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledTimes(3)
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })
})
