import { describe, expect, it } from 'vitest'
import {
  HELSINKI_TIMEZONE,
  isDateOnly,
  isIsoInstant,
  isValidDateOnly,
  parseDateOnly,
  parseDateTime,
} from './date-fns-tz.js'

describe('date-only values', () => {
  it('recognizes only the strict YYYY-MM-DD shape', () => {
    expect(isDateOnly('2026-01-15')).toBe(true)
    expect(isDateOnly('2026-1-15')).toBe(false)
    expect(isDateOnly('2026-01-15T09:00:00')).toBe(false)
    expect(isDateOnly(new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it('validates calendar dates and returns UTC midnight', () => {
    const parsed = parseDateOnly('2026-03-12')

    expect(parsed).toBeInstanceOf(Date)
    expect(parsed.toISOString()).toBe('2026-03-12T00:00:00.000Z')
  })

  it.each(['2026-02-29', '2026-04-31', '2026-00-15', '2026-13-01', '2026-01-00'])(
    'rejects impossible date-only value %s',
    (value) => {
      expect(() => parseDateOnly(value, 'box date')).toThrow('Invalid box date')
    },
  )

  it('exposes calendar validity separately from date-only shape', () => {
    expect(isValidDateOnly('2026-03-12')).toBe(true)
    expect(isValidDateOnly('2026-02-29')).toBe(false)
    expect(isValidDateOnly('2026-3-12')).toBe(false)
  })

  it('rejects values that are not date-only strings', () => {
    expect(() => parseDateOnly('2026-01-15T00:00:00Z')).toThrow('Invalid date')
    expect(() => parseDateOnly('2026-1-15')).toThrow('Invalid date')
  })
})

describe('ISO instant helpers', () => {
  it('recognizes only strings with an explicit timezone suffix', () => {
    expect(isIsoInstant('2026-01-15T09:00:00Z')).toBe(true)
    expect(isIsoInstant('2026-01-15T09:00:00+02:00')).toBe(true)
    expect(isIsoInstant('2026-01-15T09:00:00')).toBe(false)
  })
})

describe('parseDateTime', () => {
  it('exports the fixed Helsinki business timezone', () => {
    expect(HELSINKI_TIMEZONE).toBe('Europe/Helsinki')
  })

  it('clones Date inputs without reinterpreting their instant', () => {
    const input = new Date('2026-01-15T07:00:00.000Z')
    const parsed = parseDateTime(input)

    expect(parsed).not.toBe(input)
    expect(parsed.toISOString()).toBe(input.toISOString())
  })

  it('preserves strings with an explicit timezone as instants', () => {
    expect(parseDateTime('2026-01-15T09:00:00+02:00').toISOString()).toBe(
      '2026-01-15T07:00:00.000Z',
    )
  })

  it('interprets timezone-less strings in the supplied timezone', () => {
    expect(parseDateTime('2026-01-15T09:00:00', 'date', 'America/New_York').toISOString()).toBe(
      '2026-01-15T14:00:00.000Z',
    )
  })

  it('defaults timezone-less strings to Helsinki time', () => {
    expect(parseDateTime('2026-01-15T09:00:00').toISOString()).toBe(
      '2026-01-15T07:00:00.000Z',
    )
  })

  it('throws a clear error for invalid values', () => {
    expect(() => parseDateTime('not-a-date')).toThrow('Invalid date')
    expect(() => parseDateTime(new Date('invalid'), 'booking date')).toThrow(
      'Invalid booking date',
    )
  })
})
