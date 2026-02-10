use('admin')

db.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD)

use('prod')

// Create collections if they don't exist (idempotent)
if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users')
  print('Created collection users')
}

// Ensure unique username index
try {
  db.users.createIndex({ username: 1 }, { unique: true })
  print('Ensured unique index on users.username')
} catch (e) {
  print('Index creation skipped or failed: ' + e)
}
