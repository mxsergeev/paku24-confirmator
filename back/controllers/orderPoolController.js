const orderPoolRouter = require('express').Router()
const sanitizeHtml = require('sanitize-html')
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
  const potentiallyDirtyText = req.body.order
  const cleanText = sanitizeHtml(potentiallyDirtyText, {
    allowedTags: [],
    allowedAttributes: [],
  })
  try {
    const receivedOrder = new RawOrder({
      text: cleanText,
      date: req.body.date,
      confirmed: false,
      markedForDeletion: false,
    })

    await receivedOrder.save()

    return res.status(201)
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.use(authenticateAccessToken)

orderPoolRouter.get('/', async (req, res, next) => {
  try {
    const ordersInPool = await RawOrder.find({ markedForDeletion: false })
      .sort({ date: -1 })
      .exec()

    // Documents are automatically transformed to JSON
    return res.status(200).send(ordersInPool)
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.get('/deleted', async (req, res, next) => {
  try {
    const deletedOrdersInPool = await RawOrder.find({ markedForDeletion: true })
      .sort({ date: -1 })
      .exec()

    // Documents are automatically transformed to JSON
    return res.status(200).send(deletedOrdersInPool)
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
    await RawOrder.findByIdAndUpdate({ _id: id }, { confirmed: true })
    return res.status(200).send({ message: 'Order confirmed' })
  } catch (err) {
    return next(err)
  }
})

module.exports = orderPoolRouter
