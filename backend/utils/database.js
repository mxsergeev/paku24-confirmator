import mongoose from 'mongoose'

import * as config from './config.js'

const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
}

function connectToDatabase({ uri = config.MONGODB_URI, autoIndex = true } = {}) {
  return mongoose.connect(uri, { ...connectionOptions, autoIndex })
}

function disconnectFromDatabase() {
  return mongoose.disconnect()
}

export { connectToDatabase, disconnectFromDatabase }
