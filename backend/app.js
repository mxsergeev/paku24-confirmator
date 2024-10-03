const express = require('express')
const path = require('path')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const morgan = require('morgan')
const mongoose = require('mongoose')

const config = require('./utils/config.js')
const logger = require('./utils/logger.js')
const errorHandler = require('./utils/errorHandler.middleware.js')
const filterReqsBasedOnUrl = require('./utils/filterReqsBasedOnUrl.middleware.js')

const calendarRouter = require('./modules/calendar/calendar.controller.js')
const emailRouter = require('./modules/email/email.controller.js')
const orderPoolRouter = require('./modules/orderPool/orderPool.controller.js')
const smsRouter = require('./modules/sms/sms.controller.js')
const loginRouter = require('./modules/authentication/auth.login.controller.js')
const logoutRouter = require('./modules/authentication/auth.logout.controller.js')
const registrationRouter = require('./modules/authentication/auth.registration.controller.js.js')
const tokenRouter = require('./modules/authentication/auth.token.controller.js')

mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    logger.info('Connected to MongoDB.')
  })
  .catch((err) => {
    logger.error('Error connecting to MongoDB:', err.message)
  })

const app = express()

app.set('trust proxy', 'loopback')

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

app.use(helmet())

app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.redirect('/app')
})

app.use(filterReqsBasedOnUrl)

app.use('/api/token', tokenRouter)
app.use('/api/login', loginRouter)
app.use('/api/logout', logoutRouter)
app.use('/api/registration', registrationRouter)

app.use('/api/sms', smsRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/email', emailRouter)
app.use('/api/order-pool/', orderPoolRouter)

app.use(express.static(path.join(__dirname, '..', 'build')))
app.get('/app*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '/build/index.html'))
})

app.use(errorHandler)

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

module.exports = app
