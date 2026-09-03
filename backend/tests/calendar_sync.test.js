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
const ORDER_ID = '66c000000000000000000001'

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
      _id: ORDER_ID,
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
      { _id: ORDER_ID },
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

  it('rejects deleted orders before touching Google Calendar', async () => {
    const deletedOrder = {
      _id: ORDER_ID,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      calendarEventIds: { main: null, boxDelivery: null, boxReturn: null },
    }

    await expect(syncOrderToCalendar(deletedOrder)).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'Deleted orders cannot be synchronized to calendar.',
    })
    expect(mocks.addEventToCalendar).not.toHaveBeenCalled()
    expect(mocks.updateEventInCalendar).not.toHaveBeenCalled()
  })

  it('deletes stale box events and persists the remaining IDs', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])

    await syncOrderToCalendar({
      _id: ORDER_ID,
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
      { _id: ORDER_ID },
      { $set: { calendarEventIds: { main: 'main-existing', boxDelivery: null, boxReturn: null } } },
    )
  })

  it('clears successful stale deletions before surfacing a later failure', async () => {
    const failure = new Error('return deletion failed')
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])
    mocks.deleteEventFromCalendar
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(failure)

    const order = {
      _id: ORDER_ID,
      calendarEventIds: {
        main: 'main-existing',
        boxDelivery: 'delivery-stale',
        boxReturn: 'return-stale',
      },
    }

    await expect(syncOrderToCalendar(order)).rejects.toBe(failure)

    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: ORDER_ID },
      {
        $set: {
          calendarEventIds: {
            main: 'main-existing',
            boxDelivery: null,
            boxReturn: 'return-stale',
          },
        },
      },
    )
    expect(order.calendarEventIds).toEqual({
      main: 'main-existing',
      boxDelivery: null,
      boxReturn: 'return-stale',
    })
    expect(mocks.updateEventInCalendar).not.toHaveBeenCalled()
    expect(mocks.addEventToCalendar).not.toHaveBeenCalled()
  })

  it('treats not-found stale events as already deleted', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])
    mocks.deleteEventFromCalendar.mockRejectedValueOnce({ response: { status: 404 } })

    const order = {
      _id: ORDER_ID,
      calendarEventIds: {
        main: 'main-existing',
        boxDelivery: 'delivery-missing',
        boxReturn: null,
      },
    }

    await expect(syncOrderToCalendar(order)).resolves.toMatchObject({
      calendarEventIds: {
        main: 'main-existing',
        boxDelivery: null,
        boxReturn: null,
      },
    })
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: ORDER_ID },
      {
        $set: {
          calendarEventIds: {
            main: 'main-existing',
            boxDelivery: null,
            boxReturn: null,
          },
        },
      },
    )
  })

  it('clears a missing main event ID and creates one replacement', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])
    mocks.updateEventInCalendar.mockRejectedValueOnce({ response: { status: 404 } })

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: 'main-missing', boxDelivery: null, boxReturn: null },
    }

    await expect(syncOrderToCalendar(order)).resolves.toMatchObject({
      calendarEventIds: { main: 'move-created', boxDelivery: null, boxReturn: null },
    })

    expect(mocks.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: ORDER_ID },
      { $set: { 'calendarEventIds.main': null } },
    )
    expect(mocks.addEventToCalendar).toHaveBeenCalledTimes(1)
    expect(order.calendarEventIds.main).toBe('move-created')
  })

  it('recreates only a missing box delivery event', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([
      { role: 'main', summary: 'move' },
      { role: 'boxDelivery', summary: 'delivery' },
    ])
    mocks.updateEventInCalendar
      .mockResolvedValueOnce({ data: { id: 'main-existing' } })
      .mockRejectedValueOnce({ response: { status: 404 } })

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: 'main-existing', boxDelivery: 'delivery-missing', boxReturn: null },
    }

    await syncOrderToCalendar(order)

    expect(mocks.addEventToCalendar).toHaveBeenCalledTimes(1)
    expect(mocks.addEventToCalendar).toHaveBeenCalledWith({ summary: 'delivery' })
    expect(order.calendarEventIds).toEqual({
      main: 'main-existing',
      boxDelivery: 'delivery-created',
      boxReturn: null,
    })
  })

  it('does not create a replacement when clearing a stale ID fails', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])
    mocks.updateEventInCalendar.mockRejectedValueOnce({ response: { status: 404 } })
    const failure = new Error('cannot clear stale ID')
    mocks.updateOne.mockRejectedValueOnce(failure)

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: 'main-missing', boxDelivery: null, boxReturn: null },
    }

    await expect(syncOrderToCalendar(order)).rejects.toBe(failure)
    expect(mocks.addEventToCalendar).not.toHaveBeenCalled()
    expect(order.calendarEventIds.main).toBe('main-missing')
  })

  it('rolls back a replacement when its new ID cannot be persisted', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])
    mocks.updateEventInCalendar.mockRejectedValueOnce({ response: { status: 404 } })
    const failure = new Error('cannot persist replacement ID')
    mocks.updateOne.mockResolvedValueOnce({ matchedCount: 1 }).mockRejectedValueOnce(failure)

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: 'main-missing', boxDelivery: null, boxReturn: null },
    }

    await expect(syncOrderToCalendar(order)).rejects.toBe(failure)
    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledWith('move-created')
    expect(order.calendarEventIds.main).toBeNull()
  })

  it('can retry safely after replacement creation fails', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([{ role: 'main', summary: 'move' }])
    const failure = new Error('replacement create failed')
    mocks.updateEventInCalendar.mockRejectedValueOnce({ response: { status: 404 } })
    mocks.addEventToCalendar.mockRejectedValueOnce(failure).mockResolvedValueOnce({
      data: { id: 'replacement-main' },
    })

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: 'main-missing', boxDelivery: null, boxReturn: null },
    }

    await expect(syncOrderToCalendar(order)).rejects.toBe(failure)
    expect(order.calendarEventIds.main).toBeNull()

    await expect(syncOrderToCalendar(order)).resolves.toMatchObject({
      calendarEventIds: { main: 'replacement-main', boxDelivery: null, boxReturn: null },
    })
    expect(mocks.addEventToCalendar).toHaveBeenCalledTimes(2)
  })

  it('does not persist a newly-created role while clearing another stale role', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([
      { role: 'main', summary: 'move' },
      { role: 'boxDelivery', summary: 'delivery' },
    ])
    mocks.updateEventInCalendar
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockRejectedValueOnce({ response: { status: 404 } })
    const deliveryFailure = new Error('delivery replacement failed')
    mocks.addEventToCalendar
      .mockResolvedValueOnce({ data: { id: 'main-replacement' } })
      .mockRejectedValueOnce(deliveryFailure)

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: 'main-missing', boxDelivery: 'delivery-missing', boxReturn: null },
    }

    await expect(syncOrderToCalendar(order)).rejects.toBe(deliveryFailure)

    expect(mocks.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: ORDER_ID },
      { $set: { 'calendarEventIds.main': null } },
    )
    expect(mocks.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: ORDER_ID },
      { $set: { 'calendarEventIds.boxDelivery': null } },
    )
    expect(mocks.updateOne).toHaveBeenCalledTimes(2)
    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledWith('main-replacement')
  })

  it('retains ownership and exposes rollback failure when a created event cannot be deleted', async () => {
    mocks.makeGoogleEventObjects.mockReturnValue([
      { role: 'main', summary: 'move' },
      { role: 'boxDelivery', summary: 'delivery' },
    ])
    const deliveryFailure = new Error('delivery create failed')
    const rollbackFailure = new Error('rollback delete failed')
    mocks.addEventToCalendar
      .mockResolvedValueOnce({ data: { id: 'main-live' } })
      .mockRejectedValueOnce(deliveryFailure)
    mocks.deleteEventFromCalendar.mockRejectedValueOnce(rollbackFailure)

    const order = {
      _id: ORDER_ID,
      calendarEventIds: { main: null, boxDelivery: null, boxReturn: null },
    }

    await expect(syncOrderToCalendar(order)).rejects.toMatchObject({
      message: 'delivery create failed',
      rollbackError: expect.objectContaining({ message: expect.stringContaining('could not be rolled back') }),
    })
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: ORDER_ID },
      { $set: { 'calendarEventIds.main': 'main-live' } },
    )
    expect(order.calendarEventIds.main).toBe('main-live')
  })

  it('rolls back events already created when a later create fails', async () => {
    const failure = new Error('delivery create failed')
    mocks.addEventToCalendar
      .mockResolvedValueOnce({ data: { id: 'main-created' } })
      .mockRejectedValueOnce(failure)

    await expect(
      syncOrderToCalendar({ _id: ORDER_ID, calendarEventIds: {} }),
    ).rejects.toBe(failure)

    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledWith('main-created')
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('surfaces a main create failure without attempting unrelated work', async () => {
    const failure = new Error('main create failed')
    mocks.addEventToCalendar.mockRejectedValue(failure)

    await expect(
      syncOrderToCalendar({ _id: ORDER_ID, calendarEventIds: {} }),
    ).rejects.toBe(failure)

    expect(mocks.addEventToCalendar).toHaveBeenCalledTimes(1)
    expect(mocks.updateEventInCalendar).not.toHaveBeenCalled()
    expect(mocks.deleteEventFromCalendar).not.toHaveBeenCalled()
    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('rejects a successful calendar create that does not return an ID', async () => {
    mocks.addEventToCalendar.mockResolvedValue({ data: {} })

    await expect(
      syncOrderToCalendar({ _id: ORDER_ID, calendarEventIds: {} }),
    ).rejects.toThrow('no event ID for role main')

    expect(mocks.updateOne).not.toHaveBeenCalled()
  })

  it('rolls back every created event when linking IDs fails', async () => {
    const failure = new Error('link failed')
    mocks.updateOne.mockRejectedValue(failure)

    await expect(
      syncOrderToCalendar({ _id: ORDER_ID, calendarEventIds: {} }),
    ).rejects.toBe(failure)

    expect(mocks.deleteEventFromCalendar.mock.calls.map(([id]) => id)).toEqual([
      'return-created',
      'delivery-created',
      'move-created',
    ])
  })

  it('clears each deleted role and lets a retry finish after a partial failure', async () => {
    const failure = new Error('main delete failed')
    const order = {
      _id: ORDER_ID,
      calendarEventIds: {
        main: 'main-existing',
        boxDelivery: 'delivery-existing',
        boxReturn: 'return-existing',
      },
    }
    mocks.deleteEventFromCalendar
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined)

    await expect(deleteOrderEvent(order)).rejects.toBe(failure)
    expect(order.calendarEventIds).toEqual({
      main: null,
      boxDelivery: 'delivery-existing',
      boxReturn: null,
    })

    await expect(deleteOrderEvent(order)).resolves.toBe(true)
    expect(mocks.deleteEventFromCalendar).toHaveBeenCalledTimes(4)
    expect(order.calendarEventIds).toEqual({ main: null, boxDelivery: null, boxReturn: null })
  })

  it('does not create duplicate role triplets when sync calls overlap', async () => {
    const order = { _id: ORDER_ID, calendarEventIds: {} }
    let releaseFirstCreate
    let firstCreateStarted
    const firstCreateGate = new Promise((resolve) => {
      releaseFirstCreate = resolve
    })
    const firstCreateStartedSignal = new Promise((resolve) => {
      firstCreateStarted = resolve
    })
    let createCount = 0

    mocks.addEventToCalendar.mockImplementation(async (event) => {
      createCount += 1
      if (createCount === 1) {
        firstCreateStarted()
        await firstCreateGate
      }
      return { data: { id: `${event.summary}-created` } }
    })

    const first = syncOrderToCalendar(order)
    await firstCreateStartedSignal
    const second = syncOrderToCalendar(order)
    releaseFirstCreate()
    await Promise.all([first, second])

    expect(mocks.addEventToCalendar).toHaveBeenCalledTimes(3)
    expect(mocks.updateEventInCalendar).toHaveBeenCalledTimes(3)
  })
})
