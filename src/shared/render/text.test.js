import { describe, expect, it } from 'vitest'
import paymentTypes from '../../data/paymentTypes.json' with { type: 'json' }
import services from '../../data/services.json' with { type: 'json' }
import { formatAddress, formatAddressLocation, formatOrder } from './text.js'

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
    returnDate: '2026-03-20T07:00:00Z',
    amount: 10,
  },
  boxesPrice: 200,
  price: 320,
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

describe('formatOrder', () => {
  it('preserves the exact full text layout', () => {
    expect(formatOrder(makeOrder())).toBe(
      [
        'VARAUKSEN TIEDOT',
        '2026-03-10',
        'ALKAMISAIKA',
        'Klo 09:00 (+/-15min)',
        'ARVIOITU KESTO',
        '2h (100€/h, Pakettiauto ja kuljettaja)',
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

  it('supports include-only, exclude, and remove-heading modes', () => {
    const order = makeOrder()
    const includeOnly = formatOrder(order, { address: 1, name: 1, boxes: 1 })
    const excluded = formatOrder(order, { fees: 0, time: 0 })
    const withoutHeading = formatOrder(order, {}, { removeFirstHeading: true })

    expect(includeOnly).toContain('LÄHTÖPAIKKA')
    expect(includeOnly).toContain('ARVIOITU HINTA')
    expect(includeOnly).not.toContain('ALKAMISAIKA')
    expect(excluded).toContain('VARAUKSEN TIEDOT')
    expect(excluded).not.toContain('ALKAMISAIKA')
    expect(withoutHeading.split('\n')[0]).toBe('2026-03-10')
  })

  it('accepts Date values for the order and box datetimes', () => {
    const output = formatOrder(
      makeOrder({
        date: new Date('2026-03-10T07:00:00.000Z'),
        boxes: {
          deliveryDate: new Date('2026-03-12T07:00:00.000Z'),
          returnDate: new Date('2026-03-20T07:00:00.000Z'),
          amount: 10,
        },
      }),
    )

    expect(output).toContain('Klo 09:00 (+/-15min)')
    expect(output).toContain('12-03-2026 09:00 - 20-03-2026 09:00')
  })

  it('keeps date-only box values free of a time component', () => {
    const output = formatOrder(
      makeOrder({
        boxes: {
          deliveryDate: '2026-03-12',
          returnDate: '2026-03-20',
          amount: 10,
        },
      }),
    )

    expect(output).toContain('12-03-2026  - 20-03-2026')
  })

  it('omits the boxes section when boxes are missing', () => {
    const output = formatOrder(makeOrder({ boxes: undefined }))

    expect(output).not.toContain('MUUTTOLAATIKOT')
  })

  it('retains the documented destination and price rendering quirks', () => {
    const output = formatOrder(
      makeOrder({
        destination: { street: 'Katu', index: '', city: 'Helsinki', floor: 0, elevator: false },
        fees: [{ name: 'nightFee', amount: 20 }],
      }),
    )

    expect(output).not.toContain('MÄÄRÄNPÄÄ')
    expect(output).toContain('YÖ/AAMULISÄ\n20€')
    expect(output).toContain('ARVIOITU HINTA\n320€')
  })
})
