use('admin')

db.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD)

use('dev')

// Create collections if they don't exist (idempotent)
if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users')
  print('Created collection users')
}
if (!db.getCollectionNames().includes('orders')) {
  db.createCollection('orders')
  print('Created collection orders')
}

// Ensure unique username index
try {
  db.users.createIndex({ username: 1 }, { unique: true })
  print('Ensured unique index on users.username')
} catch (e) {
  print('Index creation skipped or failed: ' + e)
}

// Upsert admin user (idempotent)
db.users.updateOne(
  { username: 'admin' },
  {
    $setOnInsert: {
      name: 'admin',
      username: 'admin',
      // Password is '1234'
      passwordHash: '$2b$10$.ZHaIM6NsxbqV5/7RuBp1.2OgUk9ZAHyqHpS90uWAELR.UbxFQPK.',
      email: 'paku24.confirmator@gmail.com',
      access: true,
    },
  },
  { upsert: true }
)
print('Ensured admin user exists')

// Seed orders only when collection is empty (idempotent)
if (db.orders.countDocuments() === 0) {
  db.orders.insertMany([
    {
      markedForDeletion: false,
      confirmed: false,
      receivedAt: ISODate('2026-02-09T13:49:08.358Z'),
      date: ISODate('2026-02-14T20:00:00.000Z'),
      duration: 2,
      service: {
        id: '4',
        name: 'Pakettiauto, kantava kuljettaja ja kaksi kantajaa',
        pricePerHour: 120,
      },
      paymentType: {
        id: '3',
        name: 'Lasku (yritysasiakkaat)',
        fee: 5,
      },
      fees: [
        { name: 'weekendFee', amount: 15 },
        { name: 'nightFee', amount: 20 },
        { name: 'paymentTypeFee', amount: 5 },
      ],
      boxes: {
        amount: 30,
        pricePerBox: 0.15,
        deliveryPrice: 20,
        returnPrice: 20,
        deliveryDate: ISODate('2026-02-11T14:00:00.000Z'),
        returnDate: ISODate('2026-02-15T14:00:00.000Z'),
      },
      price: 386.5,
      address: {
        street: 'Kaivokselantie 4 C 70',
        index: '01610',
        city: 'Vantaa',
        floor: 6,
        elevator: true,
      },
      extraAddresses: [
        {
          street: 'Kaivokselantie 4 C 70',
          index: '01610',
          city: 'Vantaa',
          floor: 6,
          elevator: false,
        },
      ],
      destination: {
        street: 'Kaivokselantie 4 C 70',
        index: '01610',
        city: 'Vantaa',
        floor: 6,
        elevator: false,
      },
      name: 'Maxim Sergeev',
      email: 'themaximsergeev@gmail.com',
      phone: '+358 4578367542',
      comment: '',
    },
    {
      markedForDeletion: false,
      confirmed: false,
      receivedAt: ISODate('2026-02-09T14:06:22.286Z'),
      date: ISODate('2026-02-18T04:30:00.000Z'),
      duration: 1,
      service: {
        id: '1',
        name: 'Pakettiauto ja kuljettaja',
        pricePerHour: 50,
      },
      paymentType: {
        id: '1',
        name: 'Käteinen',
        fee: 0,
      },
      fees: [{ name: 'nightFee', amount: 20 }],
      price: 70,
      address: {
        street: 'Kaivokselantie 4 C 70',
        index: '01610',
        city: 'Vantaa',
        floor: 0,
        elevator: false,
      },
      extraAddresses: [],
      destination: {
        street: 'Kaivokselantie 4 C 70',
        index: '01610',
        city: 'Vantaa',
        floor: 0,
        elevator: false,
      },
      name: 'Maxim Sergeev',
      email: 'themaximsergeev@gmail.com',
      phone: '+358 4578367542',
      comment: '',
    },
    {
      markedForDeletion: false,
      confirmed: false,
      receivedAt: ISODate('2026-02-09T14:06:57.635Z'),
      date: ISODate('2026-03-31T09:30:00.000Z'),
      duration: 1,
      service: {
        id: '5',
        name: 'Nouto/tyhjennyspalvelu yhdellä kantajalla',
        pricePerHour: 70,
      },
      paymentType: {
        id: '2',
        name: 'Maksukortti',
        fee: 0,
      },
      fees: [{ name: 'startOrEndOfMonthFee', amount: 15 }],
      price: 85,
      address: {
        street: 'Kaivokselantie 4 C 70',
        index: '01610',
        city: 'Vantaa',
        floor: 7,
        elevator: true,
      },
      extraAddresses: [],
      destination: {
        street: 'Kaivokselantie 4 C 70',
        index: '01610',
        city: 'Vantaa',
        floor: 2,
        elevator: false,
      },
      name: 'Maxim Sergeev',
      email: 'themaximsergeev@gmail.com',
      phone: '+358 4578367542',
      comment: '',
    },
  ])
  print('Inserted seed orders')
} else {
  print('Orders collection not empty — skipping seed')
}
