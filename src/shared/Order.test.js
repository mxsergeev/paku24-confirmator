import { describe, it, expect, vi } from 'vitest'
import { enqueueSnackbar } from 'notistack'
import Order from './Order.js'
import services from '../data/services.json' with { type: 'json' }
import paymentTypes from '../data/paymentTypes.json' with { type: 'json' }

vi.mock('notistack', () => ({ enqueueSnackbar: vi.fn() }))

describe('Order.EMPTY_ORDER', () => {
  it('exposes exactly the keys iterated by prepareForSending and OrdersList', () => {
    expect(Object.keys(Order.EMPTY_ORDER)).toEqual([
      'distance',
      'hsy',
      'XL',
      'eventColor',
      'manualFees',
      'manualBoxesPrice',
      'initialFees',
      'initialBoxesPrice',
      'initialPrice',
      'manualPrice',
      'date',
      'duration',
      'service',
      'paymentType',
      'fees',
      'boxes',
      'boxesPrice',
      'price',
      'address',
      'extraAddresses',
      'destination',
      'name',
      'email',
      'phone',
      'comment',
      'canceledAt',
    ])
  })
})

describe('Order constructor', () => {
  it('Order.default() provides stable defaults', () => {
    const order = Order.default()
    expect(order.date).toBeInstanceOf(Date)
    expect(order.duration).toBe(1)
    expect(order.service).toEqual({
      id: '1',
      name: services[0].name,
      pricePerHour: 50,
    })
    expect(order.paymentType).toEqual({
      id: '1',
      name: paymentTypes[0].name,
      fee: 0,
    })
    expect(order.boxes.amount).toBe(0)
    expect(order.boxes.deliveryDate).toEqual(expect.any(String))
    expect(order.boxes.deliveryDate).not.toBe('')
    expect(order.boxes.returnDate).toEqual(expect.any(String))

    expect(order.manualPrice).toBeNull()
    expect(order.manualBoxesPrice).toBeNull()
    expect(order.initialPrice).toBeNull()
    expect(order.initialBoxesPrice).toBeNull()
    expect(order.manualFees).toBeNull()
    // EMPTY_ORDER.fees is [] (not null), so the fees setter stores [] as the
    // initial fees for a default order.
    expect(order.initialFees).toEqual([])
    expect(Array.isArray(order.fees)).toBe(true)

    // Getter fallbacks: without manual/initial values the auto values win.
    expect(order.price).toBe(order.autoPrice)
    expect(order.boxesPrice).toBe(order.autoBoxesPrice)

    // services[this.service.id] is an array index lookup, so id '1' hits
    // index 1 (the service with eventColor '7'), not index 0.
    expect(order.eventColor).toBe(services[1].eventColor)
  })

  it('new Order() and new Order({}) produce the same defaults', () => {
    const a = new Order()
    const b = new Order({})
    expect(a.service).toEqual(b.service)
    expect(a.paymentType).toEqual(b.paymentType)
    expect(a.duration).toBe(b.duration)
    expect(a.canceledAt).toBe(b.canceledAt)
    expect(a.date).toBeInstanceOf(Date)
  })

  it('round-trips identifiers and backend metadata', () => {
    const order = new Order({
      id: 'abc',
      _id: 'xyz',
      confirmed: true,
      confirmedBy: 'u1',
      receivedAt: 'r',
      deletedAt: 'd',
      markedForDeletion: true,
      invoiceNumber: '123',
      confirmedAt: 'c',
      canceledAt: 'x',
    })
    expect(order.id).toBe('abc')
    expect(order._id).toBe('xyz')
    expect(order.confirmed).toBe(true)
    expect(order.confirmedBy).toBe('u1')
    expect(order.receivedAt).toBe('r')
    expect(order.deletedAt).toBe('d')
    expect(order.markedForDeletion).toBe(true)
    expect(order.invoiceNumber).toBe('123')
    expect(order.confirmedAt).toBe('c')
    expect(order.canceledAt).toBe('x')
  })

  it('falls back to _id for id and applies defaults for absent metadata', () => {
    const order = new Order({ _id: 'xyz' })
    expect(order.id).toBe('xyz')
    expect(order.confirmed).toBe(false)
    expect(order.markedForDeletion).toBe(false)
    expect(order.confirmedAt).toBeUndefined()
    expect(order.canceledAt).toBeNull()
  })

  it('coerces boolean metadata to real booleans', () => {
    const order = new Order({ confirmed: 1, markedForDeletion: 1 })
    expect(order.confirmed).toBe(true)
    expect(typeof order.confirmed).toBe('boolean')
    expect(typeof order.markedForDeletion).toBe('boolean')
  })

  it('coerces date strings into Date instances', () => {
    const order = new Order({ date: '2026-03-10T09:00:00.000Z' })
    expect(order.date).toBeInstanceOf(Date)
    expect(order.date.getTime()).toBe(new Date('2026-03-10T09:00:00.000Z').getTime())
  })
})

describe('price, fees and boxesPrice precedence', () => {
  // Tuesday 2026-03-10 09:00 local: autoFees is [] and service price is
  // deterministic (50€/h * 2h = 100€).
  const baseOrder = (overrides = {}) =>
    new Order({
      date: new Date('2026-03-10 09:00'),
      duration: 2,
      service: services[0],
      paymentType: paymentTypes[0],
      manualFees: [],
      boxes: { deliveryDate: '2026-03-12T09:00', returnDate: '2026-03-20T09:00', amount: 0 },
      ...overrides,
    })

  it('computes servicePrice and autoPrice from the service and duration', () => {
    const order = baseOrder()
    expect(order.servicePrice).toBe(100)
    expect(order.boxesPrice).toBe(0)
    expect(order.price).toBe(100)
    expect(order.autoPrice).toBe(100)
  })

  it('prefers automatic price over stored price without a manual override', () => {
    const order = baseOrder({ price: 300 })
    expect(order.price).toBe(100)
    expect(order.initialPrice).toBe(300)
    expect(order.manualPrice).toBeNull()
  })

  it('prefers manualPrice over a stored price', () => {
    const order = baseOrder({ manualPrice: 300, price: 200 })
    expect(order.price).toBe(300)
    expect(order.initialPrice).toBe(200)
  })

  it('prefers automatic fees over stored fees without a manual override', () => {
    const order = new Order({
      date: new Date('2026-03-10 09:00'),
      fees: [{ name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 }],
    })
    expect(order.initialFees).toEqual([
      { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
    ])
    expect(order.fees).toEqual([])
  })

  it('prefers manualFees over autoFees', () => {
    const order = new Order({
      date: new Date('2026-03-10 09:00'),
      manualFees: [{ name: 'weekendFee', amount: 15 }],
    })
    expect(order.fees).toEqual([{ name: 'weekendFee', amount: 15 }])
  })

  it('prefers automatic box price over stored box price without a manual override', () => {
    const order = baseOrder({ boxesPrice: 999 })
    expect(order.boxesPrice).toBe(0)
    expect(order.initialBoxesPrice).toBe(999)
    expect(order.manualBoxesPrice).toBeNull()
  })

  it('prefers manualBoxesPrice over a stored boxesPrice', () => {
    const order = baseOrder({ manualBoxesPrice: 123 })
    expect(order.boxesPrice).toBe(123)
  })

  it('calculates autoBoxesPrice from amount, period and delivery fees', () => {
    const withAmount = (amount, deliveryDate, returnDate) =>
      new Order({ boxes: { deliveryDate, returnDate, amount } }).boxesPrice

    expect(withAmount(0, '2026-03-12T09:00', '2026-03-20T09:00')).toBe(0)
    // 8 days: 10 * 0.15 * 8 + 20 + 20
    expect(withAmount(10, '2026-03-12T09:00', '2026-03-20T09:00')).toBe(52)
    // 3 days clamps to minPeriod 7: 10 * 0.15 * 7 + 20 + 20
    expect(withAmount(10, '2026-03-12T09:00', '2026-03-15T09:00')).toBe(50.5)
  })

  describe('autoFees', () => {
    const autoFeesOrder = (dateString, paymentTypeId = '1') =>
      new Order({
        date: new Date(dateString),
        service: services[0],
        paymentType: paymentTypes.find((p) => String(p.id) === String(paymentTypeId)),
      })

    it('is empty on a regular weekday morning', () => {
      expect(autoFeesOrder('2026-03-10 09:00').fees).toEqual([])
    })

    it('adds the weekend fee on Saturdays', () => {
      expect(autoFeesOrder('2026-03-07 09:00').fees).toEqual([
        { name: 'weekendFee', label: 'VIIKONLOPPULISÄ', amount: 15 },
      ])
    })

    it('adds the night fee after 20:00', () => {
      expect(autoFeesOrder('2026-03-10 21:00').fees).toEqual([
        { name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 },
      ])
    })

    it('adds the start-or-end-of-month fee on the first day of the month', () => {
      expect(autoFeesOrder('2026-04-01 09:00').fees).toEqual([
        { name: 'startOrEndOfMonthFee', label: 'KUUNVAIHDELISÄ', amount: 15 },
      ])
    })

    it('adds the start-or-end-of-month fee on the last day of the month', () => {
      expect(autoFeesOrder('2026-03-31 09:00').fees).toEqual([
        { name: 'startOrEndOfMonthFee', label: 'KUUNVAIHDELISÄ', amount: 15 },
      ])
    })

    it('adds the payment type fee when the payment type has a fee', () => {
      expect(autoFeesOrder('2026-03-10 09:00', '3').fees).toEqual([
        { name: 'paymentTypeFee', label: 'MAKSUTAPALISÄ', amount: 5 },
      ])
    })

    it('includes weekendFee but never holidayFee on a weekend', () => {
      const feesOnSunday = autoFeesOrder('2026-04-05 09:00').fees
      expect(feesOnSunday.some((f) => f.name === 'weekendFee')).toBe(true)
      expect(feesOnSunday.some((f) => f.name === 'holidayFee')).toBe(false)
    })

    it('adds a stair fee for a qualifying address floor', () => {
      const order = new Order({
        date: new Date('2026-03-10 09:00'),
        service: services[1],
        address: {
          street: 'Testikatu 1 A 2',
          index: '',
          city: 'Helsinki',
          floor: 4,
          elevator: false,
        },
        destination: { street: '', index: '', city: '', floor: 0, elevator: false },
        extraAddresses: [],
      })
      expect(order.fees).toEqual([
        { name: 'stairsFee_0', label: 'KERROSLISÄ (Testikatu 1 A 2)', amount: 20 },
      ])
    })
  })
})

describe('eventColor shadowing and spread-reset', () => {
  it('stores an explicit eventColor in the own "color" field', () => {
    const order = new Order()
    order.eventColor = '5'
    expect(order.eventColor).toBe('5')
    expect(order.color).toBe('5')
    expect(Object.prototype.hasOwnProperty.call(order, 'color')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(order, 'eventColor')).toBe(false)
  })

  it('derives eventColor from the service when no explicit color is set', () => {
    // services[this.service.id] is an array index lookup: id '2' hits index 2
    // (service id '3', eventColor '9').
    expect(new Order({ service: services[1] }).eventColor).toBe('9')
  })

  it('does not retain explicit event color when an Order is spread into a new one', () => {
    const order = new Order()
    order.eventColor = '5'
    const wrapped = new Order({ ...order, confirmedAt: '2026-03-10T10:00:00.000Z' })
    expect(wrapped.color).toBeNull()
    expect(wrapped.eventColor).toBe(services[1].eventColor)
  })
})

describe('Order.format', () => {
  const fmtOrder = () =>
    new Order({
      // Absolute instant whose Helsinki wall time is 09:00: Order.format
      // The renderer always uses Helsinki time, regardless of the process timezone.
      date: new Date('2026-03-10T07:00:00Z'),
      duration: 2,
      service: services[0],
      paymentType: paymentTypes[1],
      manualFees: [],
      address: {
        street: 'Testikatu 1 A 2',
        index: '',
        city: 'Helsinki',
        floor: 3,
        elevator: false,
      },
      destination: {
        street: 'Testikatu 2 B 3',
        index: '',
        city: 'Helsinki',
        floor: 0,
        elevator: false,
      },
      extraAddresses: [],
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '+00000000000',
      comment: 'Fixture comment',
      boxes: {
        deliveryDate: '2026-03-12T07:00:00Z',
        returnDate: '2026-03-20T07:00:00Z',
        amount: 10,
      },
      manualBoxesPrice: 200,
      manualPrice: 320,
    })

  it('renders the full default layout', () => {
    expect(Order.format(fmtOrder())).toBe(
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

  it('removeFirstHeading strips the title line', () => {
    const out = Order.format(fmtOrder(), {}, { removeFirstHeading: true })
    expect(out.split('\n')[0]).toBe('2026-03-10')
  })

  it('include-only mode renders only the selected sections', () => {
    const out = Order.format(fmtOrder(), { address: 1, name: 1, email: 1, phone: 1, boxes: 1 })
    expect(out).toContain('LÄHTÖPAIKKA')
    expect(out).toContain('NIMI')
    expect(out).toContain('SÄHKÖPOSTI')
    expect(out).toContain('PUHELIN')
    expect(out).toContain('MUUTTOLAATIKOT')
    expect(out).not.toContain('ARVIOITU HINTA')
    expect(out).not.toContain('VARAUKSEN TIEDOT')
    expect(out).not.toContain('ALKAMISAIKA')
  })

  it('includes the price block only when it is selected', () => {
    const out = Order.format(fmtOrder(), { address: 1, price: 1 })
    expect(out).toContain('LÄHTÖPAIKKA')
    expect(out).toContain('ARVIOITU HINTA\n320€')
  })

  it('exclude mode drops the time section but keeps title and price', () => {
    const out = Order.format(fmtOrder(), { fees: 0, time: 0 })
    expect(out).toContain('VARAUKSEN TIEDOT')
    expect(out).toContain('ARVIOITU HINTA')
    expect(out).not.toContain('ALKAMISAIKA')
  })

  it('renders manual fees in the fees section', () => {
    const order = new Order({
      ...fmtOrder(),
      manualFees: [{ name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 }],
    })
    expect(Order.format(order)).toContain('YÖ/AAMULISÄ\n20€')
  })

  it('omits the destination section when its street is too short', () => {
    const order = new Order({
      ...fmtOrder(),
      destination: { street: 'Katu', index: '', city: 'Helsinki', floor: 0, elevator: false },
    })
    expect(Order.format(order)).not.toContain('MÄÄRÄNPÄÄ')
  })

  it('omits the boxes section when the amount is 0', () => {
    const order = new Order({ ...fmtOrder(), boxes: { ...fmtOrder().boxes, amount: 0 } })
    expect(Order.format(order)).not.toContain('MUUTTOLAATIKOT')
  })

  it('renders elevator and floor info in the comment section', () => {
    const withLift = new Order({
      ...fmtOrder(),
      address: { ...fmtOrder().address, floor: 3, elevator: true },
    })
    expect(Order.format(withLift)).toContain('Lähtö: 3 krs., hissi on.')

    const withDestFloor = new Order({
      ...fmtOrder(),
      destination: { ...fmtOrder().destination, floor: 5 },
    })
    expect(Order.format(withDestFloor)).toContain('Määränpää: 5 krs., ei hissiä.')
  })
})

describe('Order.getAvailableFees', () => {
  it('returns the five base fees when no order is given', () => {
    const result = Order.getAvailableFees()
    expect(result).toHaveLength(5)
    expect(result.every((f) => f.name !== 'stairsFee')).toBe(true)
    expect(result.some((f) => f.name === 'weekendFee')).toBe(true)
    expect(Order.getAvailableFees(null)).toHaveLength(5)
  })

  const floorOrder = (address, destination, extra = []) => ({
    service: services[1],
    address,
    destination,
    extraAddresses: extra,
  })

  it('adds a stair fee for an address floor above startFloor', () => {
    const result = Order.getAvailableFees(
      floorOrder(
        { street: 'Testikatu 1 A 2', index: '', city: 'Helsinki', floor: 4, elevator: false },
        { street: '', index: '', city: '', floor: 0, elevator: false },
      ),
    )
    expect(result).toContainEqual({
      name: 'stairsFee_0',
      label: 'KERROSLISÄ (Testikatu 1 A 2)',
      amount: 20,
    })
  })

  it('skips floors below startFloor', () => {
    const result = Order.getAvailableFees(
      floorOrder(
        { street: 'A', index: '', city: '', floor: 1, elevator: false },
        { street: '', index: '', city: '', floor: 0, elevator: false },
      ),
    )
    expect(result.filter((f) => f.name.startsWith('stairsFee'))).toHaveLength(0)
  })

  it('skips addresses with an elevator', () => {
    const result = Order.getAvailableFees(
      floorOrder(
        { street: 'B', index: '', city: '', floor: 4, elevator: true },
        { street: '', index: '', city: '', floor: 0, elevator: false },
      ),
    )
    expect(result.filter((f) => f.name.startsWith('stairsFee'))).toHaveLength(0)
  })

  it('adds one stair fee per qualifying address', () => {
    const result = Order.getAvailableFees(
      floorOrder(
        { street: 'Testikatu 1 A 2', index: '', city: 'Helsinki', floor: 4, elevator: false },
        { street: 'Testikatu 2 B 3', index: '', city: 'Helsinki', floor: 6, elevator: false },
      ),
    )
    expect(result).toContainEqual({
      name: 'stairsFee_0',
      label: 'KERROSLISÄ (Testikatu 1 A 2)',
      amount: 20,
    })
    expect(result).toContainEqual({
      name: 'stairsFee_1',
      label: 'KERROSLISÄ (Testikatu 2 B 3)',
      amount: 40,
    })
  })

  it('does not add stair fees for a service with multiplier 0', () => {
    const result = Order.getAvailableFees({
      service: services[0],
      address: { street: 'C', index: '', city: '', floor: 4, elevator: false },
      destination: { street: '', index: '', city: '', floor: 0, elevator: false },
      extraAddresses: [],
    })
    expect(result.filter((f) => f.name.startsWith('stairsFee'))).toHaveLength(0)
  })
})

describe('Order.prepareForSending', () => {
  it('converts dates to UTC ISO strings and keeps computed values', () => {
    const order = new Order({
      date: new Date('2026-03-10 20:00'),
      duration: 2,
      service: services[0],
      paymentType: paymentTypes[0],
      manualFees: [{ name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 }],
      manualBoxesPrice: 200,
      manualPrice: 320,
      boxes: { deliveryDate: '2026-03-12T09:00', returnDate: '2026-03-20T09:00', amount: 10 },
      canceledAt: '2026-03-11T10:00:00.000Z',
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '+00000000000',
      address: {
        street: 'Testikatu 1 A 2',
        index: '00100',
        city: 'Helsinki',
        floor: 0,
        elevator: false,
      },
      destination: {
        street: 'Testikatu 2 B 3',
        index: '00500',
        city: 'Helsinki',
        floor: 0,
        elevator: false,
      },
      extraAddresses: [],
    })
    const prepared = order.prepareForSending()
    expect(prepared.date).toBe('2026-03-10T18:00:00.000Z')
    expect(prepared.boxes.deliveryDate).toBe('2026-03-12T07:00:00.000Z')
    expect(prepared.boxes.returnDate).toBe('2026-03-20T07:00:00.000Z')
    expect(prepared.price).toBe(320)
    expect(prepared.fees).toEqual([{ name: 'nightFee', label: 'YÖ/AAMULISÄ', amount: 20 }])
    expect(prepared.boxesPrice).toBe(200)
    expect(prepared.time).toBe('20:00')
    expect(prepared.eventColor).toBe(services[1].eventColor)
    expect(prepared.canceledAt).toBe('2026-03-11T10:00:00.000Z')
  })

  it('serializes exactly the EMPTY_ORDER keys plus time', () => {
    const prepared = new Order({ date: new Date('2026-03-10 09:00') }).prepareForSending()
    expect(Object.keys(prepared).sort()).toEqual(
      Object.keys(Order.EMPTY_ORDER).concat(['time']).sort(),
    )
    expect(prepared.id).toBeUndefined()
    expect(prepared.confirmed).toBeUndefined()
  })

  it('silently resolves to the auto price when a stored price is shadowed', () => {
    const order = new Order({
      date: new Date('2026-03-10 09:00'),
      duration: 2,
      price: 300,
      manualFees: [],
    })
    expect(order.prepareForSending().price).toBe(100)
    expect(order.initialPrice).toBe(300)
  })

  it('does not throw for a default order', () => {
    const prepared = Order.default().prepareForSending()
    expect(typeof prepared.date).toBe('string')
    expect(typeof prepared.boxes.deliveryDate).toBe('string')
    expect(typeof prepared.boxes.returnDate).toBe('string')
  })
})

describe('Order.setupOrderFromText', () => {
  it('parses a JSON payload into an Order', async () => {
    const order = await Order.setupOrderFromText(
      JSON.stringify({
        date: '2026-03-10T09:00:00.000Z',
        duration: 2,
        service: services[0],
        paymentType: paymentTypes[1],
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+00000000000',
        comment: 'Fixture comment',
      }),
    )
    expect(order).toBeInstanceOf(Order)
    expect(order.date.getTime()).toBe(new Date('2026-03-10T09:00:00.000Z').getTime())
    expect(order.duration).toBe(2)
    expect(order.name).toBe('Test Customer')
    expect(order.email).toBe('customer@example.com')
    expect(order.phone).toBe('+00000000000')
    expect(order.comment).toBe('Fixture comment')
    expect(order.service).toEqual(services[0])
    expect(order.paymentType).toEqual(paymentTypes[1])
  })

  it('loses a stored price before the first constructor hop', async () => {
    const order = await Order.setupOrderFromText(
      JSON.stringify({
        date: '2026-03-10T09:00:00.000Z',
        duration: 2,
        service: services[0],
        paymentType: paymentTypes[1],
        price: 300,
        name: 'Test Customer',
      }),
    )
    expect(order.price).toBe(100)
  })

  it('parses a WordPress booking text and falls back to defaults where extraction crashes', async () => {
    const text = `Service: Pakettiauto ja kuljettaja
Accessories: None

Date and time: Saturday, April 10th 2026 09:00
Duration: 2 h

Start location: Helsinki / 00100 Testikatu 1 A 2
End location: Helsinki / 00500 Testikatu 2 B 3
Name: Test Customer
Email: customer@example.com
Phone: +00000000000
Comment: Fixture comment

Payment Type: Maksukortti
PRICE
— Amount: 10
— Price: 200
— Booking time starts: 2026-04-10T09:00
— Booking time ends: 2026-04-20T09:00
— Self pickup: No
— Self return: No

--
Tämä viesti lähetettiin sivustolta Paku24.fi (https://paku24.fi)`

    const order = await Order.setupOrderFromText(text)
    expect(order).toBeInstanceOf(Order)
    expect(order.date).toBeInstanceOf(Date)
    expect(order.date.getFullYear()).toBe(2026)
    // TextOrder.duration lookahead (?=\sh.) fails because "h" ends its line
    // (the following '.' cannot match '\n'), so the getter throws and the
    // default duration 1 is used after the rewrap.
    expect(order.duration).toBe(1)
    expect(order.name).toBe('Test Customer')
    expect(order.email).toBe('customer@example.com')
    expect(order.phone).toBe('+00000000000')
    expect(order.comment).toContain('Fixture comment')
    expect(order.comment).not.toContain('Tämä viesti lähetettiin')
    expect(order.address).toBe('Testikatu 1 A 2, 00100 Helsinki')
    expect(order.destination).toBe('Testikatu 2 B 3, 00500 Helsinki')
    expect(order.service).toEqual(Order.EMPTY_ORDER.service)
    expect(order.paymentType).toEqual(Order.EMPTY_ORDER.paymentType)
    expect(order.boxes).toEqual(Order.EMPTY_ORDER.boxes)
    expect(enqueueSnackbar).toHaveBeenCalled()
  })
})

describe('Order.makeCalendarEntries', () => {
  it('produces move, deliveryDate and returnDate entries', () => {
    const order = new Order({
      // Absolute instants so the renderer's Helsinki-local times are
      // deterministic in any container timezone.
      date: new Date('2026-03-10T07:00:00Z'),
      duration: 2,
      service: services[0],
      paymentType: paymentTypes[1],
      manualFees: [],
      address: {
        street: 'Testikatu 1 A 2',
        index: '',
        city: 'Helsinki',
        floor: 0,
        elevator: false,
      },
      destination: {
        street: 'Testikatu 2 B 3',
        index: '',
        city: 'Helsinki',
        floor: 0,
        elevator: false,
      },
      extraAddresses: [],
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '+00000000000',
      boxes: {
        deliveryDate: '2026-03-12T07:00:00Z',
        returnDate: '2026-03-20T07:00:00Z',
        amount: 10,
      },
      manualBoxesPrice: 200,
      manualPrice: 320,
    })
    const entries = Order.makeCalendarEntries(order)
    expect(Object.keys(entries)).toEqual(['move', 'deliveryDate', 'returnDate'])

    expect(entries.move.title.endsWith('09:00(2h) Test Customer')).toBe(true)
    expect(entries.move.description).toContain('Määrä: 10 kpl')
    expect(entries.move.description).toContain('Testikatu 1 A 2')

    expect(entries.deliveryDate.title.endsWith('09:00 Test Customer')).toBe(true)
    expect(entries.deliveryDate.description).toContain('12-03-2026 09:00 - 20-03-2026 09:00')

    expect(entries.returnDate.title.startsWith('NOUTO')).toBe(true)
    expect(entries.returnDate.title.endsWith('09:00 Test Customer')).toBe(true)
    expect(entries.returnDate.description).toContain('Testikatu 2 B 3')
  })
})
