import RefreshToken from '../models/refreshToken.js'
import User from '../models/user.js'
import { connectToDatabase, disconnectFromDatabase } from '../utils/database.js'
import { initializeDB } from './test_helper.js'

function useTestDatabase() {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || !process.env.TEST_MONGODB_URI) {
      throw new Error('Database tests require NODE_ENV=test and TEST_MONGODB_URI')
    }

    await connectToDatabase({ uri: process.env.TEST_MONGODB_URI, autoIndex: false })
    await User.deleteMany({})
    await RefreshToken.deleteMany({})
    await User.syncIndexes()
    await initializeDB()
  })

  beforeEach(async () => {
    await initializeDB()
  })

  afterAll(async () => {
    await disconnectFromDatabase()
  })
}

export default useTestDatabase
