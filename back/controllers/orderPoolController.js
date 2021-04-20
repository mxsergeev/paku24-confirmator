const orderPoolRouter = require('express').Router()
const RawOrder = require('../models/rawOrder.js')
const { ORDER_POOL_KEY } = require('../utils/config')
const newErrorWithCustomName = require('../utils/helpers/newErrorWithCustomName')
const {
  authenticateAccessToken,
} = require('../utils/middleware/authentication')

function checkSecretKey(req, res, next) {
  if (req.body.key === ORDER_POOL_KEY) return next()

  const OrderPoolKeyError = newErrorWithCustomName('OrderPoolKeyError')
  return next(OrderPoolKeyError)
}

orderPoolRouter.post('/add', checkSecretKey, async (req, res, next) => {
  try {
    const receivedOrder = new RawOrder({
      text: req.body.order,
      date: req.body.date,
      confirmed: false,
    })

    await receivedOrder.save()

    return res.status(200)
  } catch (err) {
    return next(err)
  }
})

orderPoolRouter.use(authenticateAccessToken)

orderPoolRouter.get('/', async (req, res, next) => {
  try {
    const ordersInPool = await RawOrder.find({}).sort({ date: -1 }).exec()

    // Documents are automatically transformed to JSON
    return res.status(200).send(ordersInPool)
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
