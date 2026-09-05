import { describe, expect, it } from 'vitest'
import {
  HELSINKI_TIMEZONE,
  calendarDateToUtc,
  formatHelsinkiCalendarDate,
  formatHelsinkiInstant,
  formatInTimeZone,
  helsinkiCalendarDateToInstant,
  isDateOnly,
  isIsoInstant,
  parseInstant,
} from './date-fns-tz.js'
import { helsinkiDstTransitions } from './testFixtures/orderFixtures.js'

describe('date-only values', () => {
  it('recognizes only the strict YYYY-MM-DD shape', () => {
    expect(isDateOnly('2026-01-15')).toBe(true)
    expect(isDateOnly('2026-1-15')).toBe(false)
    expect(isDateOnly('2026-01-15T09:00:00')).toBe(false)
    expect(isDateOnly(new Date('2026-01-15T00:00:00.000Z'))).toBe(false)
  })

  it.each(['2026-02-29', '2026-04-31', '2026-00-15', '2026-13-01', '2026-01-00'])(
    'rejects impossible date-only value %s',
    (value) => {
      expect(() => calendarDateToUtc(value, 'box date')).toThrow('Invalid box date')
    },
  )

  it('rejects values that are not date-only strings', () => {
    expect(() => calendarDateToUtc('2026-01-15T00:00:00Z')).toThrow('Invalid date')
    expect(() => calendarDateToUtc('2026-1-15')).toThrow('Invalid date')
  })
})

describe('ISO instant helpers', () => {
  it('recognizes only strings with an explicit timezone suffix', () => {
    expect(isIsoInstant('2026-01-15T09:00:00Z')).toBe(true)
    expect(isIsoInstant('2026-01-15T09:00:00+02:00')).toBe(true)
    expect(isIsoInstant('2026-01-15T09:00:00')).toBe(false)
  })
})

describe('parseInstant', () => {
  it('exports the fixed Helsinki business timezone', () => {
    expect(HELSINKI_TIMEZONE).toBe('Europe/Helsinki')
  })

  it('clones Date inputs without reinterpreting their instant', () => {
    const input = new Date('2026-01-15T07:00:00.000Z')
    const parsed = parseInstant(input)

    expect(parsed).not.toBe(input)
    expect(parsed.toISOString()).toBe(input.toISOString())
  })

  it('preserves strings with an explicit timezone as instants', () => {
    expect(parseInstant('2026-01-15T09:00:00+02:00').toISOString()).toBe(
      '2026-01-15T07:00:00.000Z',
    )
  })

  it('rejects timezone-less strings', () => {
    expect(() => parseInstant('2026-01-15T09:00:00')).toThrow(
      'Invalid date: expected an absolute instant',
    )
  })

  it('throws a clear error for invalid values', () => {
    expect(() => parseInstant('not-a-date')).toThrow('Invalid date')
    expect(() => parseInstant(new Date('invalid'), 'booking date')).toThrow(
      'Invalid booking date',
    )
  })
})

describe('Helsinki display helpers', () => {
  it('converts a Helsinki calendar date and wall-clock hour without hard-coded offsets', () => {
    const instant = helsinkiCalendarDateToInstant('2026-07-15', 9)

    expect(formatHelsinkiInstant(instant, 'dd.MM.yyyy HH:mm')).toBe('15.07.2026 09:00')
  })

  it('defaults generic formatting to Helsinki', () => {
    expect(formatInTimeZone('2026-01-15T07:00:00.000Z', 'dd.MM.yyyy HH:mm')).toBe(
      '15.01.2026 09:00',
    )
  })

  it('formats absolute instants in Helsinki regardless of host timezone', () => {
    expect(formatHelsinkiInstant('2026-01-15T07:00:00.000Z', 'dd.MM.yyyy HH:mm')).toBe(
      '15.01.2026 09:00',
    )
    expect(formatHelsinkiInstant('2026-06-15T06:00:00.000Z', 'dd.MM.yyyy HH:mm')).toBe(
      '15.06.2026 09:00',
    )
  })

  it('keeps date-only values as calendar dates without adding midnight', () => {
    expect(formatHelsinkiCalendarDate('2026-03-12', 'box date')).toBe('2026-03-12')
  })

  it('formats instants by their Helsinki calendar date', () => {
    expect(
      formatHelsinkiCalendarDate('2026-01-15T22:30:00.000Z', 'order date'),
    ).toBe('2026-01-16')
  })

  it('keeps both Helsinki DST transition boundaries tied to the correct instant', () => {
    const { springForward, fallBack } = helsinkiDstTransitions

    expect(parseInstant(springForward.before.local).toISOString()).toBe(
      springForward.before.instant,
    )
    expect(formatHelsinkiInstant(springForward.after.instant, 'yyyy-MM-dd HH:mm:ss XXX')).toBe(
      '2026-03-29 04:00:00 +03:00',
    )
    expect(parseInstant(fallBack.before.local).toISOString()).toBe(fallBack.before.instant)
    expect(formatHelsinkiInstant(fallBack.after.instant, 'yyyy-MM-dd HH:mm:ss XXX')).toBe(
      '2026-10-25 03:00:00 +02:00',
    )
  })
})
