export function isCanceled(order) {
  if (!order) return false
  return Boolean(order.isCanceled || order.canceledAt)
}

export function isDeleted(order) {
  if (!order) return false
  return Boolean(order.markedForDeletion || order.deletedAt)
}

export function isConfirmed(order) {
  if (!order) return false
  return Boolean(order.confirmedAt)
}
