import { describe, expect, it } from 'vitest'
import {
  cloneValue,
  hasOwn,
  isPlainObject,
  ORDER_ORIGINS,
  PRICING_COMPONENTS,
  PRICING_SOURCES,
  requireFiniteNumber,
  toFiniteNumberOrNull,
} from './orderPrimitives.js'

describe('order primitives', () => {
  it('defines the shared order-domain constants', () => {
    expect(PRICING_COMPONENTS).toEqual(['price', 'fees', 'boxesPrice'])
    expect(PRICING_SOURCES).toEqual(['initial', 'auto', 'manual'])
    expect(ORDER_ORIGINS).toEqual(['app', 'wordpress'])
  })

  it('recognizes plain objects and own keys safely', () => {
    const withoutPrototype = Object.create(null)
    withoutPrototype.value = 1

    expect(isPlainObject(withoutPrototype)).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
    expect(hasOwn(withoutPrototype, 'value')).toBe(true)
    expect(hasOwn(withoutPrototype, 'toString')).toBe(false)
  })

  it('clones nested order values without sharing dates or objects', () => {
    const original = {
      date: new Date('2026-01-15T07:00:00.000Z'),
      nested: { fees: [{ amount: 4 }] },
    }
    const copy = cloneValue(original)

    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
    expect(copy.date).not.toBe(original.date)
    expect(copy.nested).not.toBe(original.nested)
    expect(copy.nested.fees).not.toBe(original.nested.fees)
    expect(copy.nested.fees[0]).not.toBe(original.nested.fees[0])
  })

  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['  ', null],
    ['12.5', 12.5],
    [12.5, 12.5],
    [Infinity, null],
    ['not-a-number', null],
  ])('parses finite numbers consistently: %p -> %p', (value, expected) => {
    expect(toFiniteNumberOrNull(value)).toBe(expected)
  })

  it('provides the same field-specific error for required finite numbers', () => {
    expect(requireFiniteNumber('3.5', 'boxes.amount')).toBe(3.5)
    expect(() => requireFiniteNumber('', 'boxes.amount')).toThrow(
      'Invalid boxes.amount: expected a finite number'
    )
  })
})
