import { describe, expect, it } from 'vitest'
import { resolveEventColorId } from './eventColor.js'

describe('resolveEventColorId', () => {
  it('uses the service color when the order is automatic', () => {
    expect(
      resolveEventColorId({
        eventColor: null,
        service: { name: 'Pakettiauto ja kuljettaja', eventColor: '1' },
      }),
    ).toBe('1')
  })

  it('preserves a configured explicit color', () => {
    expect(
      resolveEventColorId({
        eventColor: '11',
        service: { name: 'Pakettiauto ja kuljettaja', eventColor: '1' },
      }),
    ).toBe('11')
  })

  it('uses the default when no configured color exists', () => {
    expect(resolveEventColorId({ eventColor: null, service: { name: 'Unknown service' } })).toBe('7')
  })
})
