use('admin')

db.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD)

use('dev')

db.createCollection('users')

db.users.insertOne({
  name: 'admin',
  username: 'admin',
  // Password is '1234'
  passwordHash: '$2b$10$.ZHaIM6NsxbqV5/7RuBp1.2OgUk9ZAHyqHpS90uWAELR.UbxFQPK.',
  email: 'paku24.confirmator@gmail.com',
  access: true,
})
