import OrderModel from '../../models/order.js'
import { makeGoogleEventObjects } from './calendar.helpers.js'
import {
  addEventToCalendar,
  updateEventInCalendar,
  deleteEventFromCalendar,
} from './calendar.googleAPI.js'
import * as logger from '../../utils/logger.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import {
  CALENDAR_EVENT_ROLES,
  makeCalendarEventIds,
} from '../../../src/shared/orderModel.js'

function storedCalendarEventIds(order) {
  const source = typeof order?.toObject === 'function' ? order.toObject() : order
  const ids = source?.calendarEventIds || {}
  const legacyMainId = source?.googleEventId || order?.googleEventId || null
  return CALENDAR_EVENT_ROLES.reduce((result, role) => {
    result[role] = ids[role] || (role === 'main' ? legacyMainId : null)
    return result
  }, makeCalendarEventIds())
}

function legacyGoogleEventId(order) {
  const source = typeof order?.toObject === 'function' ? order.toObject() : order
  return source?.googleEventId || order?.googleEventId || null
}

function clearLegacyGoogleEventId(order) {
  if (!order) return
  if (typeof order.set === 'function') {
    order.set('googleEventId', undefined)
  } else {
    delete order.googleEventId
  }
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

// Calendar operations for the same persisted order must not overlap. This is
// intentionally local to this service: the app runs as one process and a
// small promise queue is enough to serialize retries and service operations.
const orderLocks = new Map()

function withOrderCalendarLock(id, operation) {
  if (id === null || id === undefined || id === '') return operation()

  const key = typeof id.toString === 'function' ? id.toString() : String(id)

  const previous = orderLocks.get(key)
  const predecessor = previous || Promise.resolve()
  const run = () => operation()
  const current = predecessor.then(run, run)
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

async function persistCalendarEventIds(order, ids, { clearLegacy = true } = {}) {
  if (!order?._id) return null

  const update = { $set: { calendarEventIds: { ...ids } } }
  if (clearLegacy && legacyGoogleEventId(order)) update.$unset = { googleEventId: '' }
  const result = await OrderModel.updateOne(
    { _id: order._id },
    update,
  )
  assertPersistenceSucceeded(result, order._id)
  if (clearLegacy) clearLegacyGoogleEventId(order)
  return result
}

async function persistCalendarEventId(order, role, eventId, { clearLegacy = false } = {}) {
  if (!order?._id) return null

  const update = { $set: { [`calendarEventIds.${role}`]: eventId } }
  if (clearLegacy && role === 'main' && legacyGoogleEventId(order)) {
    update.$unset = { googleEventId: '' }
  }
  const result = await OrderModel.updateOne(
    { _id: order._id },
    update,
  )
  assertPersistenceSucceeded(result, order._id)
  if (clearLegacy) clearLegacyGoogleEventId(order)
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

async function deleteDistinctLegacyMainEvent(order, canonicalMainId) {
  const legacyId = legacyGoogleEventId(order)
  if (!legacyId || legacyId === canonicalMainId) return

  try {
    await deleteEventFromCalendar(legacyId)
  } catch (error) {
    if (!isCalendarEventNotFound(error)) throw error
  }
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
  if (order.deletedAt) {
    throw newErrorWithCustomName('ValidationError', 'Deleted orders cannot be synchronized to calendar.')
  }

  const desired = desiredEvents(order)
  const previousIds = storedCalendarEventIds(order)
  const nextIds = { ...previousIds }
  const responses = {}
  const createdEvents = []
  const legacyMainId = legacyGoogleEventId(order)
  const legacyMainCanBeCleared = !legacyMainId || legacyMainId === previousIds.main

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
        await persistCalendarEventIds(order, nextIds, {
          clearLegacy: legacyMainCanBeCleared,
        })
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
          await persistCalendarEventId(order, role, null, {
            clearLegacy: role === 'main' && legacyMainCanBeCleared,
          })
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

    await deleteDistinctLegacyMainEvent(order, previousIds.main)
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

async function syncOrderToCalendar(order, { lock = true } = {}) {
  if (!order) return null
  if (order.deletedAt) {
    throw newErrorWithCustomName('ValidationError', 'Deleted orders cannot be synchronized to calendar.')
  }

  const operation = () => reconcileOrderToCalendar(order)
  const id = order._id ?? order.id
  return lock ? withOrderCalendarLock(id, operation) : operation()
}

async function removeOrderEvents(order) {
  if (!order) return null

  const ids = storedCalendarEventIds(order)
  const legacyId = legacyGoogleEventId(order)
  const hasDistinctLegacyMain = Boolean(legacyId && legacyId !== ids.main)
  const activeRoles = CALENDAR_EVENT_ROLES.filter((role) => ids[role])
  if (activeRoles.length === 0 && !hasDistinctLegacyMain) return null

  const deletionFailures = []
  const nextIds = { ...ids }
  let legacyMainDeleted = !hasDistinctLegacyMain

  if (hasDistinctLegacyMain) {
    try {
      await deleteEventFromCalendar(legacyId)
      legacyMainDeleted = true
    } catch (error) {
      if (isCalendarEventNotFound(error)) {
        legacyMainDeleted = true
      } else {
        deletionFailures.push({ role: 'legacy-main', eventId: legacyId, error })
        logger.error(`Failed to delete legacy calendar event ${legacyId}`, error)
      }
    }
  }

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

    try {
      await persistCalendarEventIds(order, nextIds, { clearLegacy: legacyMainDeleted })
      order.calendarEventIds = { ...nextIds }
    } catch (error) {
      deletionFailures.push({ role, eventId: ids[role], error })
      logger.error(`Failed to clear calendar event ID ${ids[role]}`, error)
    }
  }

  if (activeRoles.length === 0 && legacyMainDeleted) {
    try {
      await persistCalendarEventIds(order, nextIds)
      order.calendarEventIds = { ...nextIds }
    } catch (error) {
      deletionFailures.push({ role: 'legacy-main', eventId: legacyId, error })
      logger.error(`Failed to clear legacy calendar event ID ${legacyId}`, error)
    }
  }

  throwDeletionFailures(deletionFailures, 'Calendar order deletion')

  return true
}

async function deleteOrderEvent(order, { lock = true } = {}) {
  if (!order) return null

  const operation = () => removeOrderEvents(order)
  const id = order._id ?? order.id
  return lock ? withOrderCalendarLock(id, operation) : operation()
}

export {
  CALENDAR_EVENT_ROLES,
  withOrderCalendarLock,
  syncOrderToCalendar,
  deleteOrderEvent,
}
