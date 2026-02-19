import http from 'http'
import app from './app.js'
import * as config from './utils/config.js'
import * as logger from './utils/logger.js'

const server = http.createServer(app)

server.listen(config.BACKEND_PORT, () => {
  logger.info(`Server listening on port ${config.BACKEND_PORT}`)
})
