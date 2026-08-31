import OrderModel from '../../models/order.js'
import { makeGoogleEventObjects } from './calendar.helpers.js'
import {
  addEventToCalendar,
  updateEventInCalendar,
  deleteEventFromCalendar,
} from './calendar.googleAPI.js'
import * as logger from '../../utils/logger.js'
import {
  CALENDAR_EVENT_ROLES,
  makeCalendarEventIds,
} from '../../../src/shared/orderModel.js'

function storedCalendarEventIds(order) {
  const ids = order?.calendarEventIds || {}
  return CALENDAR_EVENT_ROLES.reduce((result, role) => {
    result[role] = ids[role] || null
    return result
  }, makeCalendarEventIds())
}

function desiredEvents(order) {
  const events = makeGoogleEventObjects(order) || []
  const desired = {}

  events.forEach((event) => {
    const role = event?.role
    if (!CALENDAR_EVENT_ROLES.includes(role)) {
      throw new Error(`Calendar event is missing a valid role: ${String(role)}`)
    }
    if (desired[role]) throw new Error(`Duplicate calendar event role: ${role}`)
    const { role: _role, ...resource } = event
    desired[role] = resource
  })

  return desired
}

function eventId(response) {
  return response?.data?.id || response?.id || null
}

function orderLockKey(order) {
  const id = order?._id ?? order?.id
  if (id === null || id === undefined || id === '') return null
  return typeof id.toString === 'function' ? id.toString() : String(id)
}

// Calendar operations for the same persisted order must not overlap. This is
// intentionally local to this service: the app runs as one process and a
// small promise queue is enough to serialize retries and model-hook calls.
const orderLocks = new Map()

function withOrderCalendarLock(order, operation) {
  const key = orderLockKey(order)
  if (!key) return operation(order)

  const previous = orderLocks.get(key)
  const predecessor = previous || Promise.resolve()
  const current = predecessor.then(operation, operation)
  orderLocks.set(key, current)

  // Do not leave rejected promises in the queue, and only remove this call's
  // entry so a newer operation cannot be detached from its predecessor.
  current.then(
    () => {
      if (orderLocks.get(key) === current) orderLocks.delete(key)
    },
    () => {
      if (orderLocks.get(key) === current) orderLocks.delete(key)
    },
  )

  return current
}

function canReloadPersistedOrder(order) {
  const key = orderLockKey(order)
  return typeof OrderModel.findById === 'function' && /^[a-f\d]{24}$/i.test(key || '')
}

async function loadLatestPersistedOrder(order) {
  if (!canReloadPersistedOrder(order)) return order
  return OrderModel.findById(order._id ?? order.id)
}

function isCalendarEventNotFound(error) {
  const responseStatus = error?.response?.status
  const responseCode = error?.response?.data?.error?.code
  return [error?.code, error?.status, error?.statusCode, responseStatus, responseCode].some(
    (value) => Number(value) === 404,
  )
}

function assertPersistenceSucceeded(result, orderId) {
  if (!orderId) return
  if (!result) {
    throw new Error(`Calendar event IDs could not be persisted for order ${orderId}`)
  }

  const matched = result.matchedCount ?? result.n
  if (matched === 0) {
    throw new Error(`Calendar event IDs could not be persisted for order ${orderId}`)
  }
}

async function persistCalendarEventIds(order, ids) {
  if (!order?._id) return null

  const result = await OrderModel.updateOne(
    { _id: order._id },
    { $set: { calendarEventIds: { ...ids } } },
  )
  assertPersistenceSucceeded(result, order._id)
  return result
}

async function persistCalendarEventId(order, role, eventId) {
  if (!order?._id) return null

  const result = await OrderModel.updateOne(
    { _id: order._id },
    { $set: { [`calendarEventIds.${role}`]: eventId } },
  )
  assertPersistenceSucceeded(result, order._id)
  return result
}

async function rollbackCreatedEvents(createdEvents, order) {
  const failures = []

  for (const { role, eventId } of [...createdEvents].reverse()) {
    try {
      await deleteEventFromCalendar(eventId)
    } catch (error) {
      let trackingError = null
      try {
        // If cleanup fails, keep ownership of the live event so a later retry
        // can delete it instead of leaking an untracked Google event.
        await persistCalendarEventId(order, role, eventId)
        if (order) {
          order.calendarEventIds = {
            ...storedCalendarEventIds(order),
            [role]: eventId,
          }
        }
      } catch (persistError) {
        trackingError = persistError
      }

      failures.push({ role, eventId, error, trackingError })
      logger.error(`Failed to roll back newly-created calendar event ${eventId}`, error)
      if (trackingError) {
        logger.error(`Failed to preserve ownership of calendar event ${eventId}`, trackingError)
      }
    }
  }

  if (failures.length > 0) {
    const aggregate = new AggregateError(
      failures.flatMap(({ error, trackingError }) => [error, trackingError].filter(Boolean)),
      `${failures.length} newly-created calendar events could not be rolled back`,
    )
    aggregate.failures = failures
    throw aggregate
  }
}

function throwDeletionFailures(failures, context) {
  if (failures.length === 0) return
  if (failures.length === 1) throw failures[0].error

  const aggregate = new AggregateError(
    failures.map(({ error }) => error),
    `${context}: ${failures.length} calendar events could not be deleted`,
  )
  aggregate.failures = failures
  throw aggregate
}

/**
 * Reconcile all calendar events owned by an order using role-specific IDs.
 *
 * A role with a stored ID is updated in place. A desired role without an ID is
 * created and linked. A stored role which is no longer desired is deleted.
 * Stale event IDs are cleared after each successful deletion. This means a
 * later failure leaves only the failed role linked, so a retry can safely
 * continue. Newly-created events are still linked in one final write.
 */
async function reconcileOrderToCalendar(order) {
  if (!order) return null

  const desired = desiredEvents(order)
  const previousIds = storedCalendarEventIds(order)
  const nextIds = { ...previousIds }
  const responses = {}
  const createdEvents = []

  try {
    // Clear stale roles before creating missing roles. Successful clears are
    // persisted immediately, so a later deletion failure remains retry-safe.
    const deletionFailures = []
    for (const role of CALENDAR_EVENT_ROLES) {
      if (desired[role] || !previousIds[role]) continue

      let deletionError = null
      try {
        await deleteEventFromCalendar(previousIds[role])
      } catch (error) {
        if (!isCalendarEventNotFound(error)) deletionError = error
      }

      if (deletionError) {
        deletionFailures.push({ role, eventId: previousIds[role], error: deletionError })
        logger.error(`Failed to delete stale calendar event ${previousIds[role]}`, deletionError)
        continue
      }

      nextIds[role] = null
      try {
        await persistCalendarEventIds(order, nextIds)
        order.calendarEventIds = { ...nextIds }
      } catch (error) {
        deletionFailures.push({ role, eventId: previousIds[role], error })
        logger.error(`Failed to clear stale calendar event ID ${previousIds[role]}`, error)
      }
    }
    throwDeletionFailures(deletionFailures, 'Calendar reconciliation')

    for (const role of CALENDAR_EVENT_ROLES) {
      if (!desired[role]) continue

      if (previousIds[role]) {
        try {
          responses[role] = await updateEventInCalendar(previousIds[role], desired[role])
          continue
        } catch (error) {
          if (!isCalendarEventNotFound(error)) throw error

          // Google no longer knows this stored event. Clear the stale owner
          // before creating a replacement so a failed replacement cannot
          // leave Mongo pointing at a known-missing event.
          nextIds[role] = null
          await persistCalendarEventId(order, role, null)
          order.calendarEventIds = { ...nextIds }
        }
      }

      const response = await addEventToCalendar(desired[role])
      const id = eventId(response)
      if (!id) throw new Error(`Calendar create returned no event ID for role ${role}`)

      responses[role] = response
      nextIds[role] = id
      createdEvents.push({ role, eventId: id })
    }

    await persistCalendarEventIds(order, nextIds)
    order.calendarEventIds = { ...nextIds }

    return {
      main: responses.main || null,
      events: responses,
      calendarEventIds: nextIds,
    }
  } catch (err) {
    let rollbackError = null
    try {
      await rollbackCreatedEvents(createdEvents, order)
    } catch (cleanupError) {
      rollbackError = cleanupError
      logger.error('Calendar event rollback failed', cleanupError)
    }
    logger.error('syncOrderToCalendar failed', err)
    if (rollbackError) err.rollbackError = rollbackError
    throw err
  }
}

async function syncOrderToCalendar(order) {
  if (!order) return null

  return withOrderCalendarLock(order, async () => {
    let latestOrder = null
    try {
      latestOrder = await loadLatestPersistedOrder(order)
      const result = await reconcileOrderToCalendar(latestOrder)
      if (latestOrder && latestOrder !== order && result?.calendarEventIds) {
        order.calendarEventIds = { ...result.calendarEventIds }
      }
      return result
    } catch (error) {
      if (latestOrder && latestOrder !== order && latestOrder.calendarEventIds) {
        order.calendarEventIds = { ...latestOrder.calendarEventIds }
      }
      throw error
    }
  })
}

async function removeOrderEvents(order, { clearStoredIds = true } = {}) {
  if (!order) return null

  const ids = storedCalendarEventIds(order)
  const activeRoles = CALENDAR_EVENT_ROLES.filter((role) => ids[role])
  if (activeRoles.length === 0) return null

  const deletionFailures = []
  const nextIds = { ...ids }
  for (const role of activeRoles) {
    try {
      await deleteEventFromCalendar(ids[role])
      nextIds[role] = null
    } catch (error) {
      if (isCalendarEventNotFound(error)) {
        nextIds[role] = null
      } else {
        deletionFailures.push({ role, eventId: ids[role], error })
        logger.error(`Failed to delete calendar event ${ids[role]}`, error)
        continue
      }
    }

    if (clearStoredIds) {
      try {
        await persistCalendarEventIds(order, nextIds)
        order.calendarEventIds = { ...nextIds }
      } catch (error) {
        deletionFailures.push({ role, eventId: ids[role], error })
        logger.error(`Failed to clear calendar event ID ${ids[role]}`, error)
      }
    } else {
      order.calendarEventIds = { ...nextIds }
    }
  }

  throwDeletionFailures(deletionFailures, 'Calendar order deletion')

  return true
}

async function deleteOrderEvent(order, options = {}) {
  if (!order) return null

  return withOrderCalendarLock(order, async () => {
    // A post findOneAndDelete hook intentionally receives a document that is
    // no longer in Mongo, so it must use that document rather than reloading.
    const latestOrder = options.clearStoredIds === false
      ? order
      : await loadLatestPersistedOrder(order)
    const result = await removeOrderEvents(latestOrder, options)
    if (latestOrder && latestOrder !== order) {
      order.calendarEventIds = { ...latestOrder.calendarEventIds }
    }
    return result
  })
}

export {
  CALENDAR_EVENT_ROLES,
  syncOrderToCalendar,
  deleteOrderEvent,
}
