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

if (db.orders.countDocuments() === 0) {
  db.orders.insertMany([
    {
      markedForDeletion: false,
      confirmed: false,
      receivedAt: ISODate('2026-02-11T12:28:50.637Z'),
      date: ISODate('2026-02-14T11:00:00.000Z'),
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
        {
          name: 'weekendFee',
          amount: 15,
        },
        {
          name: 'stairsFee',
          amount: 35,
          comment: 'Address 1',
        },
        {
          name: 'paymentTypeFee',
          amount: 5,
        },
      ],
      boxes: {
        amount: 30,
        pricePerBox: 0.15,
        deliveryPrice: 20,
        returnPrice: 20,
        deliveryDate: ISODate('2026-02-13T11:00:00.000Z'),
        returnDate: ISODate('2026-02-15T11:00:00.000Z'),
      },
      boxesPrice: 71.5,
      price: 371.5,
      address: {
        street: 'Address 1',
        index: '00001',
        city: 'City',
        floor: 6,
        elevator: false,
      },
      extraAddresses: [
        {
          street: 'Address 2',
          index: '00002',
          city: 'City',
          floor: 3,
          elevator: false,
        },
      ],
      destination: {
        street: 'Address 3',
        index: '00003',
        city: 'City',
        floor: 30,
        elevator: true,
      },
      name: 'John Doe',
      email: 'john.doe@mail.com',
      phone: '000000000000',
      comment: '',
    },
    {
      markedForDeletion: false,
      confirmed: false,
      receivedAt: ISODate('2026-02-11T12:43:18.292Z'),
      date: ISODate('2026-03-02T20:00:00.000Z'),
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
      fees: [
        {
          name: 'nightFee',
          amount: 20,
        },
      ],
      boxesPrice: null,
      price: 70,
      address: {
        street: 'Address 1',
        index: '00000',
        city: 'City',
        floor: 0,
        elevator: false,
      },
      extraAddresses: [],
      destination: {
        street: 'Address 2',
        index: '00000',
        city: 'City',
        floor: 0,
        elevator: false,
      },
      name: 'John Doe',
      email: 'john.doe@mail.com',
      phone: '00000000000',
      comment: '',
    },
    {
      markedForDeletion: false,
      confirmed: false,
      receivedAt: ISODate('2026-02-11T12:44:22.029Z'),
      date: ISODate('2026-03-05T13:00:00.000Z'),
      duration: 1,
      service: {
        id: '5',
        name: 'Nouto/tyhjennyspalvelu yhdellä kantajalla',
        pricePerHour: 70,
      },
      paymentType: {
        id: '1',
        name: 'Käteinen',
        fee: 0,
      },
      fees: [],
      boxesPrice: null,
      price: 70,
      address: {
        street: 'Address 1',
        index: '00000',
        city: 'City',
        floor: 0,
        elevator: false,
      },
      extraAddresses: [],
      destination: {
        street: 'Address 2',
        index: '00000',
        city: 'City',
        floor: 0,
        elevator: false,
      },
      name: 'John Doe',
      email: 'john.doe@mail.com',
      phone: '00000000000',
      comment: '',
    },
  ])
  print('Inserted seed orders')
} else {
  print('Orders collection not empty — skipping seed')
}
