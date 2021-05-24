const express = require('express')
const path = require('path')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const morgan = require('morgan')
const mongoose = require('mongoose')

const config = require('./utils/config')
const logger = require('./utils/logger')
const errorHandler = require('./utils/errorHandler.middleware')
const filterReqsBasedOnUrl = require('./utils/filterReqsBasedOnUrl.middleware')

const calendarRouter = require('./modules/calendar/calendar.controller')
const emailRouter = require('./modules/email/email.controller')
const orderPoolRouter = require('./modules/orderPool/orderPool.controller')
const smsRouter = require('./modules/sms/sms.controller')
const loginRouter = require('./modules/authentication/auth.login.controller')
const logoutRouter = require('./modules/authentication/auth.logout.controller')
const registrationRouter = require('./modules/authentication/auth.registration.controller.js')
const tokenRouter = require('./modules/authentication/auth.token.controller')

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

app.use(express.static(path.join(__dirname, 'build')))
app.get('/app*', (req, res) => {
  res.sendFile(path.join(`${__dirname}/build/index.html`))
})

app.use(errorHandler)

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

module.exports = app
