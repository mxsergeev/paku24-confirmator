const orderPoolRouter = require('express').Router()
const ms = require('ms')
const CronJob = require('cron').CronJob

const RawOrder = require('../models/rawOrder.js')
const {
  ORDER_POOL_KEY,
  ACCEPTED_HOSTNAME,
  DELETE_ORDERS_AFTER,
  DELETE_ORDERS_MARKED_FOR_DELETION_AFTER,
} = require('../utils/config')
const newErrorWithCustomName = require('../utils/helpers/newErrorWithCustomName')
const logger = require('../utils/logger')
const {
  authenticateAccessToken,
} = require('../utils/middleware/authentication')

// const job = new CronJob(
//   '*/10 * * * * *',
//   async function () {
//     try {
//       const response = await RawOrder.deleteMany({
//         $or: [
//           { date: { $lt: Date.now() - ms(DELETE_ORDERS_AFTER) } },
//           {
//             markedForDeletion: true,
//             date: {
//               $lt: Date.now() - ms(DELETE_ORDERS_MARKED_FOR_DELETION_AFTER),
//             },
//           },
//         ],
//       })
//       console.log('Deleted documents:', response.deletedCount)
//     } catch (err) {
//       logger.error(err)
//     }
//   },
//   null,
//   'Europe/Helsinki'
// )

function checkRequest(req, res, next) {
  // if (req.body.key === ORDER_POOL_KEY && req.hostname === ACCEPTED_HOSTNAME) {
  if (req.body.key === ORDER_POOL_KEY) {
    return next()
  }
  const OrderPoolKeyError = newErrorWithCustomName('OrderPoolKeyError')
  return next(OrderPoolKeyError)
}

orderPoolRouter.post('/add', checkRequest, async (req, res, next) => {
  try {
    const receivedOrder = new RawOrder({
      text: req.body.order,
    })

    await receivedOrder.save()

    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.use(authenticateAccessToken)

async function getOrdersWithLimit({ markedForDeletion, skip, limit }) {
  return RawOrder.find({ markedForDeletion })
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 })
    .exec()
}

function howMuchToGet(pages) {
  // pages is something like: [ '1', '2', '3' ] (for many pages) || ['2'] (for only one page)
  const pagesInNumberType = pages.map((p) => Number(p))
  const skip = pagesInNumberType[0] == 1 ? 0 : (pagesInNumberType[0] - 1) * 20
  const limit = pagesInNumberType.length * 20

  return { skip, limit }
}

orderPoolRouter.get('/', async (req, res, next) => {
  try {
    const { deleted: markedForDeletion } = req.query
    const { skip, limit } = howMuchToGet(req.query.pages)
    console.log('deleted?', markedForDeletion)
    console.log('query', { skip, limit })
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

// orderPoolRouter.get('/deleted', async (req, res, next) => {
//   console.log('deleted', howMuchToGet(req.query.pages))
//   try {
//     const { skip, limit } = howMuchToGet(req.query.pages)
//     const deletedOrdersInPool = await getOrdersWithLimit({
//       markedForDeletion: true,
//       skip,
//       limit,
//     })

//     // Documents are automatically transformed to JSON
//     return res.status(200).send(deletedOrdersInPool)
//   } catch (err) {
//     return next(err)
//   }
// })

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
    await RawOrder.findByIdAndUpdate({ _id: id }, { confirmed: true })
    return res.status(200).send({ message: 'Order confirmed' })
  } catch (err) {
    return next(err)
  }
})

module.exports = orderPoolRouter
