import isISO8601 from 'validator/lib/isISO8601.js'

import express from 'express'

const orderPoolRouter = express.Router()

import { ORDER_POOL_KEY } from '../../utils/config.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import * as authMW from '../authentication/auth.middleware.js'
import Order from '../../models/order.js'
import User from '../../models/user.js'
import dayjs from '../../../src/shared/dayjs.js'
import {
  updateOrder,
  getOrderById,
  revertOrder,
  deleteOrderPermanently,
  confirmOrder,
  cancelOrder,
  updateOrderColor,
  deleteOrder,
  retrieveOrder,
  restoreOrder,
} from './orderPool.service.js'
import { buildStableInvoiceNumber } from '../../utils/invoiceNumber.js'
import {
  BOOKING_FIELDS,
  createAppOrder,
  createWordPressOrder,
} from '../../../src/shared/orderModel.js'
import {
  hasOwn,
  isOrderValidationError,
  isPlainObject,
} from '../../../src/shared/orderPrimitives.js'
import { normalizeWordPressOrderPayload } from '../../../src/shared/wordpressOrderPayload.js'

const ORDER_POOL_PAGE_SIZE = 20

function checkKeyOrAuth(req, res, next) {
  if (ORDER_POOL_KEY && req.body?.key === ORDER_POOL_KEY) {
    req.orderPoolOrigin = 'wordpress'
    return next()
  }

  req.orderPoolOrigin = 'app'
  return authMW.authenticateAccessToken(req, res, next)
}

function validationError(message) {
  return newErrorWithCustomName('ValidationError', message)
}

function orderResult(result) {
  if (result && result.warning && Object.prototype.hasOwnProperty.call(result, 'order')) {
    return { order: result.order, warning: result.warning }
  }

  return { order: result }
}

function sendOrderResult(res, result, message) {
  const payload = orderResult(result)
  if (message) payload.message = message
  return res.status(200).send(payload)
}

function pickBookingFields(orderData) {
  const bookingFields = {}

  BOOKING_FIELDS.forEach((field) => {
    if (hasOwn(orderData, field)) bookingFields[field] = orderData[field]
  })

  return bookingFields
}

function buildOrderForCreate(req) {
  const orderData = req.body?.order

  if (!isPlainObject(orderData)) {
    throw validationError('order must be an object')
  }

  // The snapshot is immutable source metadata. It is always built by the
  // server, including when a caller explicitly sends null.
  if (hasOwn(orderData, 'initialSnapshot')) {
    throw validationError('initialSnapshot is server-managed and cannot be supplied')
  }

  try {
    if (req.orderPoolOrigin === 'wordpress') {
      return createWordPressOrder(normalizeWordPressOrderPayload(orderData))
    }

    if (orderData.origin !== 'app') {
      throw validationError("Authenticated order creation requires origin: 'app'")
    }

    // App-origin creation accepts booking fields only. Lifecycle fields and
    // materialized pricing projections are server-managed and are ignored.
    return createAppOrder(pickBookingFields(orderData))
  } catch (err) {
    if (err.name === 'ValidationError') throw err
    if (isOrderValidationError(err)) throw validationError(err.message)
    throw err
  }
}

orderPoolRouter.post('/v2/add', checkKeyOrAuth, async (req, res, next) => {
  try {
    const order = buildOrderForCreate(req)
    const orderToSave = { ...order }
    delete orderToSave.id
    delete orderToSave._id
    const receivedOrder = new Order({
      ...orderToSave,
      receivedAt: new Date(),
      invoiceNumber: buildStableInvoiceNumber(order),
    })

    await receivedOrder.save()

    return res.status(200).send({ message: 'Order added to the pool.', id: receivedOrder._id })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.get('/v2/:id', authMW.authenticateAccessToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await getOrderById(id)

    return res.status(200).send({ order })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.put('/v2/:id', authMW.authenticateAccessToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await updateOrder(id, req.body?.updateData)

    return sendOrderResult(res, result, 'Order updated')
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.post('/v2/:id/revert', authMW.authenticateAccessToken, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await revertOrder(id)

    return sendOrderResult(res, result, 'Order reverted')
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.use(authMW.authenticateAccessToken)

// Update event color (from ColorSelector) - debounced PATCH from frontend
orderPoolRouter.patch('/v2/:id/color', async (req, res, next) => {
  const { id } = req.params
  const { eventColor } = req.body
  try {
    const result = await updateOrderColor(id, eventColor)
    if (!result) return res.status(404).send({ error: 'Order not found' })
    return sendOrderResult(res, result, 'Event color updated')
  } catch (err) {
    return next(err)
  }
})

function makeDeletedFilter(deleted) {
  if (deleted === 'true') return { deletedAt: { $exists: true, $ne: null } }
  if (deleted === 'false') {
    return { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] }
  }
  return {}
}

function parsePages(rawPages) {
  const values = Array.isArray(rawPages) ? rawPages : [rawPages]

  if (values.length === 0) {
    throw validationError('pages must contain at least one positive integer')
  }

  return values.map((value) => {
    const normalized = String(value).trim()
    if (!/^[1-9]\d*$/.test(normalized)) {
      throw validationError('pages must contain only positive integers')
    }

    const page = Number(normalized)
    if (!Number.isSafeInteger(page)) {
      throw validationError('pages must contain only positive integers')
    }

    return page
  })
}

orderPoolRouter.get('/v2/', async (req, res, next) => {
  try {
    const { from, to, deleted } = req.query
    const deletedFilter = makeDeletedFilter(deleted)
    const hasFrom = typeof from !== 'undefined'
    const hasTo = typeof to !== 'undefined'

    if (hasFrom || hasTo) {
      if (typeof from !== 'string' || typeof to !== 'string' || !from || !to) {
        throw validationError('from and to must be provided together')
      }

      const rangeFilter = {
        $or: [
          { date: { $gte: from, $lte: to } },
          { 'boxes.deliveryDate': { $gte: from, $lte: to } },
          {
            'boxes.deliveryDate': {
              $gte: from.slice(0, 10),
              $lte: to.slice(0, 10),
            },
          },
          { 'boxes.returnDate': { $gte: from, $lte: to } },
          {
            'boxes.returnDate': {
              $gte: from.slice(0, 10),
              $lte: to.slice(0, 10),
            },
          },
        ],
      }
      const match = Object.keys(deletedFilter).length
        ? { $and: [rangeFilter, deletedFilter] }
        : rangeFilter

      const ordersInPool = await Order.find(match).sort({ _id: -1 })

      return res.status(200).send({ orders: ordersInPool })
    }

    const pages = parsePages(req.query.pages ?? ['1'])
    const firstPage = pages[0]
    const skip = firstPage === 1 ? 0 : (firstPage - 1) * ORDER_POOL_PAGE_SIZE
    const limit = pages.length * ORDER_POOL_PAGE_SIZE
    const ordersInPool = await Order.find(deletedFilter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)

    return res.status(200).send({ orders: ordersInPool, limitPerPage: ORDER_POOL_PAGE_SIZE })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.delete('/delete/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    const order = await deleteOrder(id)

    if (!order) {
      return res.status(404).send({ error: 'Order not found' })
    }

    return res.status(200).send({ message: 'Order marked for deletion', order })
  } catch (err) {
    return next(err)
  }
})

// RESTORE - clears deletedAt to un-delete an Order
orderPoolRouter.put('/v2/retrieve/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    const result = await retrieveOrder(id)

    if (!result) {
      return res.status(404).send({ error: 'Order not found' })
    }

    return sendOrderResult(res, result, 'Order retrieved')
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.put('/v2/confirm/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    const result = await confirmOrder(id, req.user.id)
    if (!result) return res.status(404).send({ error: 'Order not found' })
    return sendOrderResult(res, result, 'Order confirmed')
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.put('/v2/cancel/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    const result = await cancelOrder(id)
    if (!result) return res.status(404).send({ error: 'Order not found' })
    return sendOrderResult(res, result, 'Order canceled')
  } catch (err) {
    return next(err)
  }
})

// Permanently delete an order from DB (requires auth middleware applied above)
orderPoolRouter.delete('/v2/delete-permanent/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    const order = await deleteOrderPermanently(id)

    if (!order) {
      return res.status(404).send({ error: 'Order not found' })
    }

    return res.status(200).send({ message: 'Order permanently deleted', deletedId: id })
  } catch (err) {
    return next(err)
  }
})

// RESTORE (clear deletedAt and canceledAt, set default Peacock color)
orderPoolRouter.post('/v2/restore/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    // Authorization: only users with `access` allowed to restore orders
    const currentUser = await User.findById(req.user?.id).lean()
    if (!currentUser || !currentUser.access) {
      return res.status(403).send({ error: 'Forbidden' })
    }

    const result = await restoreOrder(id)

    if (!result) {
      return res.status(404).send({ error: 'Order not found' })
    }

    return sendOrderResult(res, result, 'Order restored')
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.get('/confirmed-by-user/', async (req, res, next) => {
  try {
    const periodFrom = isISO8601(req.query.periodFrom)
      ? req.query.periodFrom
      : dayjs().startOf('month')
    const periodTo = isISO8601(req.query.periodTo)
      ? req.query.periodTo
      : dayjs().add(1, 'month').startOf('month')

    const confirmedOrders = await Order.find({
      confirmed: true,
      ...makeDeletedFilter('false'),
      confirmedBy: req.user.id,
      confirmedAt: {
        $gte: periodFrom,
        $lt: periodTo,
      },
    })

    return res.status(200).send({ confirmedOrders })
  } catch (err) {
    return next(err)
  }
})

export default orderPoolRouter
