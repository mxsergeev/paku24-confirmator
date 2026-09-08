import { describe, expect, it } from 'vitest'
import paymentTypes from '../../data/paymentTypes.json' with { type: 'json' }
import services from '../../data/services.json' with { type: 'json' }
import {
  formatAddress,
  formatAddressLocation,
  formatBoxDeliveryCalendarDescription,
  formatBoxReturnCalendarDescription,
  formatMoveCalendarDescription,
  formatOrderForSms,
} from './text.js'

const makeOrder = (overrides = {}) => ({
  date: '2026-03-10T07:00:00.000Z',
  duration: 2,
  service: services[0],
  paymentType: paymentTypes[1],
  fees: [],
  address: {
    street: 'Testikatu 1 A 2',
    index: '',
    city: 'Helsinki',
    floor: 3,
    elevator: false,
  },
  extraAddresses: [],
  destination: {
    street: 'Testikatu 2 B 3',
    index: '',
    city: 'Helsinki',
    floor: 0,
    elevator: false,
  },
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '+00000000000',
  comment: 'Fixture comment',
  boxes: {
    deliveryDate: '2026-03-12T07:00:00Z',
    deliveryHasTime: true,
    returnDate: '2026-03-20T07:00:00Z',
    returnHasTime: true,
    amount: 10,
  },
  pricingOverrides: {
    price: 320,
    fees: [],
    boxesPrice: 200,
  },
  ...overrides,
})

describe('address rendering', () => {
  it('renders floor and elevator details for full addresses', () => {
    expect(
      formatAddress({
        street: 'Testikatu 1 A 2',
        index: '00100',
        city: 'Helsinki',
        floor: 3,
        elevator: true,
      }),
    ).toBe('Testikatu 1 A 2, 00100 Helsinki\n3 krs., hissi\n')
  })

  it('renders calendar locations without floor and elevator details', () => {
    expect(
      formatAddressLocation({
        street: 'Testikatu 1 A 2',
        index: '00100',
        city: 'Helsinki',
        floor: 3,
        elevator: true,
      }),
    ).toBe('Testikatu 1 A 2, 00100 Helsinki\n')
  })
})

describe('formatOrderForSms', () => {
  it('preserves the exact full text layout', () => {
    expect(formatOrderForSms(makeOrder())).toBe(
      [
        'VARAUKSEN TIEDOT',
        '2026-03-10',
        'ALKAMISAIKA',
        'Klo 09:00 (+/-15min)',
        'ARVIOITU KESTO',
        '2h (50€/h, Pakettiauto ja kuljettaja)',
        'MAKSUTAPA',
        'Käteinen',
        'MUUTTOLAATIKOT',
        '12-03-2026 09:00 - 20-03-2026 09:00',
        'Määrä: 10 kpl',
        'Hinta: 200€',
        'ARVIOITU HINTA',
        '320€',
        'LÄHTÖPAIKKA',
        'Testikatu 1 A 2,  Helsinki',
        '3 krs.',
        'MÄÄRÄNPÄÄ',
        'Testikatu 2 B 3,  Helsinki',
        '0 krs.',
        'NIMI',
        'Test Customer',
        'SÄHKÖPOSTI',
        'customer@example.com',
        'PUHELIN',
        '+00000000000',
        'LISÄTIETOJA',
        'Lähtö: 3 krs., ei hissiä.',
        'Fixture comment',
        '',
      ].join('\n'),
    )
  })

  it('uses fixed calendar descriptions for move and box events', () => {
    const order = makeOrder()
    const move = formatMoveCalendarDescription(order)
    const delivery = formatBoxDeliveryCalendarDescription(order)
    const returned = formatBoxReturnCalendarDescription(order)

    expect(move).toContain('Määrä: 10 kpl')
    expect(move).toContain('LÄHTÖPAIKKA')
    expect(move).not.toContain('VARAUKSEN TIEDOT')
    expect(delivery).toContain('LÄHTÖPAIKKA')
    expect(delivery).not.toContain('MÄÄRÄNPÄÄ')
    expect(returned).toContain('MÄÄRÄNPÄÄ')
    expect(returned).not.toContain('LÄHTÖPAIKKA')
  })

  it('accepts Date values for the order and box datetimes', () => {
    const output = formatOrderForSms(
      makeOrder({
        date: new Date('2026-03-10T07:00:00.000Z'),
        boxes: {
          deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
          deliveryHasTime: true,
          returnDate: new Date('2026-03-20T07:00:00.000Z'),
          returnHasTime: true,
          amount: 10,
        },
      }),
    )

    expect(output).toContain('Klo 09:00 (+/-15min)')
    expect(output).toContain('12-03-2026 09:00 - 20-03-2026 09:00')
  })

  it('keeps date-only box values free of a time component', () => {
    const output = formatOrderForSms(
      makeOrder({
        boxes: {
          deliveryDate: new Date('2026-03-12T00:00:00.000Z'),
          deliveryHasTime: false,
          returnDate: new Date('2026-03-20T00:00:00.000Z'),
          returnHasTime: false,
          amount: 10,
        },
      }),
    )

    expect(output).toContain('12-03-2026 - 20-03-2026')
  })

  it('uses Helsinki time for absolute instants regardless of the host timezone', () => {
    const output = formatOrderForSms(
      makeOrder({
        date: '2026-03-10T07:00:00Z',
        boxes: {
          deliveryDate: '2026-03-12T07:00:00Z',
          deliveryHasTime: true,
          returnDate: '2026-03-20T07:00:00Z',
          returnHasTime: true,
          amount: 10,
        },
      }),
    )

    expect(output).toContain('2026-03-10\nALKAMISAIKA\nKlo 09:00')
    expect(output).toContain('12-03-2026 09:00 - 20-03-2026 09:00')
  })

  it('rejects invalid provided datetime values with a clear error', () => {
    expect(() => formatOrderForSms(makeOrder({ date: {} }))).toThrow('Invalid order date')
    expect(() =>
      formatOrderForSms(
        makeOrder({
          boxes: {
            deliveryDate: {},
            deliveryHasTime: true,
            returnDate: '2026-03-20T07:00:00Z',
            returnHasTime: true,
            amount: 10,
          },
        }),
      ),
    ).toThrow('Invalid boxes.deliveryDate')
  })

  it('omits a short destination while still rendering fees and price', () => {
    const output = formatOrderForSms(
      makeOrder({
        destination: { street: 'Katu', index: '', city: 'Helsinki', floor: 0, elevator: false },
        pricingOverrides: { price: 320, fees: [{ name: 'nightFee', amount: 20 }], boxesPrice: 200 },
      }),
    )

    expect(output).not.toContain('MÄÄRÄNPÄÄ')
    expect(output).toContain('YÖ/AAMULISÄ\n20€')
    expect(output).toContain('ARVIOITU HINTA\n320€')
  })
})
