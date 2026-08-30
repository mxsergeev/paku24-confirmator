/**
 * Small primitives shared by the order model and its API boundaries.
 *
 * Keep this module limited to order-domain values. It is intentionally not a
 * general-purpose utility collection.
 */

export const PRICING_COMPONENTS = Object.freeze(['price', 'fees', 'boxesPrice'])
export const PRICING_SOURCES = Object.freeze(['initial', 'auto', 'manual'])
export const ORDER_ORIGINS = Object.freeze(['app', 'wordpress'])

/**
 * Errors caused by invalid order input or an invalid order-domain state.
 *
 * API boundaries may turn these into a client-facing validation response.
 * Unexpected runtime errors must retain their original type and propagate.
 */
export class OrderValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'OrderValidationError'
  }
}

export function isOrderValidationError(error) {
  return error instanceof OrderValidationError
}

export function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function cloneValue(value) {
  if (value instanceof Date) return new Date(value.getTime())
  if (Array.isArray(value)) return value.map((item) => cloneValue(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }

  return value
}

export function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function requireFiniteNumber(value, fieldName) {
  const number = toFiniteNumberOrNull(value)
  if (number === null) {
    throw new OrderValidationError(`Invalid ${fieldName}: expected a finite number`)
  }
  return number
}
