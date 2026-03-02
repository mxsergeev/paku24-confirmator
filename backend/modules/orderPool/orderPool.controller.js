import isISO8601 from 'validator/lib/isISO8601.js'

import express from 'express'

const orderPoolRouter = express.Router()

import RawOrder from '../../models/rawOrder.js'
import {
  ORDER_POOL_KEY,
} from '../../utils/config.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'
import * as authMW from '../authentication/auth.middleware.js'
import Order from '../../models/order.js'
import dayjs from '../../../src/shared/dayjs.js'
import { updateOrder, getOrderById } from './orderPool.service.js'

function checkKey(req, res, next) {
  // if (req.body.key === ORDER_POOL_KEY && req.hostname === ACCEPTED_HOSTNAME) {
  if (req.body.key === ORDER_POOL_KEY) {
    return next()
  }
  const OrderPoolKeyError = newErrorWithCustomName('OrderPoolKeyError')
  return next(OrderPoolKeyError)
}

orderPoolRouter.post('/add', checkKey, async (req, res, next) => {
  try {
    const receivedOrder = new RawOrder({
      text: req.body.order,
      date: new Date().toISOString(),
    })

    await receivedOrder.save()

    return res.status(200).send({ message: 'Order added to the pool.', id: receivedOrder._id })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.post('/v2/add', checkKey, async (req, res, next) => {
  try {
    const receivedOrder = new Order({
      receivedAt: new Date().toISOString(),
      ...req.body.order,
    })

    await receivedOrder.save()

    return res.status(200).send({ message: 'Order added to the pool.', id: receivedOrder._id })
  } catch (err) {
    console.log('err', err)

    return next(err)
  }
})

orderPoolRouter.get('/v2/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await getOrderById(id)

    return res.status(200).send({ order })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.put('/v2/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const order = await updateOrder(id, req.body.updateData)

    return res.status(200).send({ order, message: 'Order updated' })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.use(authMW.authenticateAccessToken)

async function getOrdersWithLimit({ markedForDeletion, skip, limit }) {
  return RawOrder.find({ markedForDeletion }).skip(skip).limit(limit).sort({ _id: -1 }).exec()
}

function howMuchToGet(pages = ['1']) {
  // pages is something like: [ '1', '2', '3' ] (for many pages) || ['2'] (for only one page)
  const pagesInNumberType = pages.map((p) => Number(p))
  const skip = pagesInNumberType[0] === 1 ? 0 : (pagesInNumberType[0] - 1) * 20
  const limit = pagesInNumberType.length * 20

  return { skip, limit }
}

orderPoolRouter.get('/', async (req, res, next) => {
  try {
    const { deleted: markedForDeletion } = req.query
    const { skip, limit } = howMuchToGet(req.query.pages)

    const ordersInPool = await getOrdersWithLimit({
      markedForDeletion,
      skip,
      limit,
    })

    // Documents are automatically transformed to JSON
    return res.status(200).send({ orders: ordersInPool, limitPerPage: 20 })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.get('/v2/', async (req, res, next) => {
  try {
    const { deleted } = req.query
    const { skip, limit } = howMuchToGet(req.query.pages)

    const match = {}

    if (deleted === 'true') {
      match.deletedAt = { $exists: true }
    }

    const ordersInPool = await Order.find(match).skip(skip).limit(limit).sort({ _id: -1 })

    return res.status(200).send({ orders: ordersInPool, limitPerPage: 20 })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.delete('/delete/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    await RawOrder.findByIdAndUpdate({ _id: id }, { markedForDeletion: true })
    return res.status(200).send({ message: 'Order marked for deletion' })
  } catch (err) {
    return next(err)
  }
})

// RESTORE (not retrieve)
orderPoolRouter.put('/retrieve/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    await RawOrder.findByIdAndUpdate({ _id: id }, { markedForDeletion: false })
    return res.status(200).send({ message: 'Order retrieved' })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.put('/confirm/:id', async (req, res, next) => {
  const { id } = req.params
  try {
    await RawOrder.findByIdAndUpdate(
      { _id: id },
      {
        confirmed: true,
        confirmedBy: req.user.id,
        confirmedAt: new Date().toISOString(),
      }
    )

    return res.status(200).send({ message: 'Order confirmed' })
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.get('/confirmed-by-user/', async (req, res) => {
  const periodFrom = isISO8601(req.query.periodFrom)
    ? req.query.periodFrom
    : dayjs().startOf('month')
  const periodTo = isISO8601(req.query.periodTo)
    ? req.query.periodTo
    : dayjs().add(1, 'month').startOf('month')

  const confirmedOrders = await RawOrder.find({
    confirmed: true,
    markedForDeletion: false,
    confirmedBy: req.user.id,
    confirmedAt: {
      $gte: periodFrom,
      $lt: periodTo,
    },
  })

  return res.status(200).send({ confirmedOrders })
})

export default orderPoolRouter
