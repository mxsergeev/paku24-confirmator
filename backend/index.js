const http = require('http')
const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')

const server = http.createServer(app)

server.listen(config.BACKEND_PORT, () => {
  logger.info(`Server listening on port ${config.BACKEND_PORT}`)
})
