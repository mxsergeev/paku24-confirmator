const events = new Map()
let nextFailure = null

function providerError(message, status = 500) {
  const error = new Error(message)
  error.status = status
  error.response = { status }
  return error
}

function clone(value) {
  return structuredClone(value)
}

function consumeFailure(operation) {
  if (!nextFailure || nextFailure.operation !== operation) return null
  const failure = nextFailure
  nextFailure = null
  return failure
}

function insert(event) {
  const id = event?.id
  if (!id) throw providerError('Calendar event ID is required', 400)
  if (events.has(id)) throw providerError(`Calendar event ${id} already exists`, 409)

  const failure = consumeFailure('insert')
  if (failure && !failure.afterWrite) throw providerError('Calendar insert failed', failure.status)

  events.set(id, clone(event))
  if (failure) throw providerError('Calendar insert response failed', failure.status)
  return clone(event)
}

function update(id, event) {
  const failure = consumeFailure('update')
  if (failure) throw providerError('Calendar update failed', failure.status)
  if (!events.has(id)) throw providerError(`Calendar event ${id} was not found`, 404)

  const updated = { ...clone(event), id }
  events.set(id, updated)
  return clone(updated)
}

function remove(id) {
  const failure = consumeFailure('delete')
  if (failure) throw providerError('Calendar delete failed', failure.status)
  if (!events.has(id)) throw providerError(`Calendar event ${id} was not found`, 404)
  events.delete(id)
}

function clear() {
  events.clear()
  nextFailure = null
}

function getEvents() {
  return [...events.values()].map(clone)
}

function failNext(operation, { afterWrite = false, status = 503 } = {}) {
  if (!['insert', 'update', 'delete'].includes(operation)) {
    throw new Error(`Unknown Calendar operation: ${operation}`)
  }
  nextFailure = { operation, afterWrite, status }
}

export { clear, failNext, getEvents, insert, remove as delete, update }
