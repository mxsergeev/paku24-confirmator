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

  it('uses the legacy service-name mapping and a safe default', () => {
    expect(
      resolveEventColorId({
        eventColor: null,
        service: { name: 'Van and two movers' },
      }),
    ).toBe('9')
    expect(
      resolveEventColorId({
        eventColor: null,
        service: { name: 'Pakettiauto, kantava kuljettaja ja kaksi kantajaa' },
      }),
    ).toBe('9')
    expect(resolveEventColorId({ eventColor: null, service: { name: 'Unknown service' } })).toBe('7')
  })
})
