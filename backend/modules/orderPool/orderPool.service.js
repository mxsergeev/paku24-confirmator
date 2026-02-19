import Order from '../../models/order.js'
import newErrorWithCustomName from '../../utils/newErrorWithCustomName.js'

async function getOrderById(id) {
  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 404)
  }

  return order
}

async function updateOrder(id, updateData) {
  const allowedKeys = [
    'date',
    'duration',
    'service',
    'paymentType',
    'fees',
    'address',
    'destination',
    'extraAddresses',
    'name',
    'email',
    'phone',
    'comment',
    'price',
    'boxes',
  ]

  const order = await Order.findById(id)

  if (!order) {
    throw newErrorWithCustomName('OrderNotFoundError', 404)
  }

  for (const key of allowedKeys) {
    order[key] = updateData[key]
  }

  await order.save()

  return order
}

export {
  getOrderById,
  updateOrder,
}
