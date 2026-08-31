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
    { $set: { calendarEventIds: ids } },
  )
  assertPersistenceSucceeded(result, order._id)
  return result
}

async function rollbackCreatedEvents(createdIds) {
  for (const createdId of [...createdIds].reverse()) {
    try {
      await deleteEventFromCalendar(createdId)
    } catch (rollbackError) {
      logger.error(`Failed to roll back newly-created calendar event ${createdId}`, rollbackError)
    }
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
 * Persistence happens only after the calendar operations have completed; any
 * event created during this attempt is rolled back when a later operation or
 * the database link fails.
 */
async function syncOrderToCalendar(order) {
  if (!order) return null

  const desired = desiredEvents(order)
  const previousIds = storedCalendarEventIds(order)
  const nextIds = { ...previousIds }
  const responses = {}
  const createdIds = []

  try {
    for (const role of CALENDAR_EVENT_ROLES) {
      if (!desired[role]) continue

      if (previousIds[role]) {
        responses[role] = await updateEventInCalendar(previousIds[role], desired[role])
        continue
      }

      const response = await addEventToCalendar(desired[role])
      const id = eventId(response)
      if (!id) throw new Error(`Calendar create returned no event ID for role ${role}`)

      responses[role] = response
      nextIds[role] = id
      createdIds.push(id)
    }

    const deletionFailures = []
    for (const role of CALENDAR_EVENT_ROLES) {
      if (desired[role] || !previousIds[role]) continue

      try {
        await deleteEventFromCalendar(previousIds[role])
        nextIds[role] = null
      } catch (error) {
        deletionFailures.push({ role, eventId: previousIds[role], error })
        logger.error(`Failed to delete stale calendar event ${previousIds[role]}`, error)
      }
    }
    throwDeletionFailures(deletionFailures, 'Calendar reconciliation')

    await persistCalendarEventIds(order, nextIds)
    order.calendarEventIds = { ...nextIds }

    return {
      main: responses.main || null,
      events: responses,
      calendarEventIds: nextIds,
    }
  } catch (err) {
    await rollbackCreatedEvents(createdIds)
    logger.error('syncOrderToCalendar failed', err)
    throw err
  }
}

async function deleteOrderEvent(order, { clearStoredIds = true } = {}) {
  if (!order) return null

  const ids = storedCalendarEventIds(order)
  const activeRoles = CALENDAR_EVENT_ROLES.filter((role) => ids[role])
  if (activeRoles.length === 0) return null

  const deletionFailures = []
  for (const role of activeRoles) {
    try {
      await deleteEventFromCalendar(ids[role])
    } catch (error) {
      deletionFailures.push({ role, eventId: ids[role], error })
      logger.error(`Failed to delete calendar event ${ids[role]}`, error)
    }
  }
  throwDeletionFailures(deletionFailures, 'Calendar order deletion')

  if (clearStoredIds && order._id) {
    const result = await OrderModel.updateOne(
      { _id: order._id },
      { $set: { calendarEventIds: makeCalendarEventIds() } },
    )
    assertPersistenceSucceeded(result, order._id)
    order.calendarEventIds = makeCalendarEventIds()
  }

  return true
}

export {
  CALENDAR_EVENT_ROLES,
  syncOrderToCalendar,
  deleteOrderEvent,
}
