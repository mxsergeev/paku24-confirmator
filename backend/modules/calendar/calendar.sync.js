import OrderModel from '../../models/order.js'
import { makeGoogleEventObjects } from './calendar.helpers.js'
import {
  addEventToCalendar,
  updateEventInCalendar,
  deleteEventFromCalendar,
  findEventByStartAndSummary,
} from './calendar.googleAPI.js'
import * as logger from '../../utils/logger.js'

/**
 * Synchronize order to Google Calendar. Creates or updates main event (first entry).
 * Does not block caller; caller should handle errors/logging as appropriate.
 */
async function syncOrderToCalendar(order) {
  if (!order) return null

  try {
    const events = makeGoogleEventObjects(order)
    if (!events || events.length === 0) return null

    const mainEvent = events[0]

    logger.info(`syncOrderToCalendar: order=${order._id} googleEventId=${order.googleEventId}`)

    if (order.googleEventId) {
      // update existing event
      logger.info(
        `syncOrderToCalendar: updating event ${order.googleEventId} for order ${order._id}`
      )
      const ev = await updateEventInCalendar(order.googleEventId, mainEvent)
      logger.info(`syncOrderToCalendar: update result for order=${order._id} evId=${ev?.data?.id}`)
      return ev
    }

    // Before inserting, re-check DB in case a concurrent sync already wrote googleEventId
    const fresh = await OrderModel.findById(order._id).select('googleEventId').lean()
    if (fresh && fresh.googleEventId) {
      logger.info(
        `syncOrderToCalendar: detected googleEventId=${fresh.googleEventId} (concurrent), updating instead of inserting for order ${order._id}`
      )
      const evUpdate = await updateEventInCalendar(fresh.googleEventId, mainEvent)
      logger.info(`syncOrderToCalendar: concurrent-update result evId=${evUpdate?.data?.id}`)
      return evUpdate
    }

    // Before inserting, try to find an existing event in Google that matches
    // the main event (created earlier by the UI). This handles the case when
    // the client created a provisional event before the order was saved.
    let ev = null
    const startIso = mainEvent.start?.dateTime || mainEvent.start?.date
    if (startIso && mainEvent.summary) {
      const existing = await findEventByStartAndSummary(startIso, mainEvent.summary)
      if (existing && existing.id) {
        logger.info(
          `syncOrderToCalendar: found existing event ${existing.id} matching summary/start for order ${order._id}, using it instead of inserting`
        )
        // ensure DB points to this event
        await OrderModel.updateOne({ _id: order._id }, { $set: { googleEventId: existing.id } })
        // fetch full event structure via updateEventInCalendar to normalize shape
        ev = await updateEventInCalendar(existing.id, mainEvent)
        logger.info(`syncOrderToCalendar: linked to existing event id=${existing.id}`)
        return ev
      }
    }

    // insert new event
    logger.info(`syncOrderToCalendar: inserting new event for order ${order._id}`)
    ev = await addEventToCalendar(mainEvent)
    const eventId = ev?.data?.id
    logger.info(`syncOrderToCalendar: inserted event id=${eventId} for order ${order._id}`)
    if (eventId) {
      const res = await OrderModel.updateOne(
        { _id: order._id },
        { $set: { googleEventId: eventId } }
      )
      logger.info(
        `syncOrderToCalendar: wrote googleEventId for order=${order._id} result=${JSON.stringify(
          res
        )}`
      )
    }
    return ev
  } catch (err) {
    logger.error('syncOrderToCalendar failed', err)
    throw err
  }
}

async function deleteOrderEvent(order) {
  if (!order || !order.googleEventId) return null
  try {
    await deleteEventFromCalendar(order.googleEventId)
    // clear googleEventId in DB
    await OrderModel.updateOne({ _id: order._id }, { $unset: { googleEventId: '' } })
    return true
  } catch (err) {
    logger.error('deleteOrderEvent failed', err)
    throw err
  }
}

async function linkOrderToEvent(orderId, eventId) {
  if (!orderId || !eventId) return null
  try {
    const res = await OrderModel.updateOne({ _id: orderId }, { $set: { googleEventId: eventId } })
    logger.info(
      `linkOrderToEvent: order=${orderId} -> event=${eventId} result=${JSON.stringify(res)}`
    )
    return res
  } catch (err) {
    logger.error('linkOrderToEvent failed', err)
    throw err
  }
}

export { syncOrderToCalendar, deleteOrderEvent, linkOrderToEvent }
