const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const mongoose = require('mongoose')

const config = require('./utils/config')
const logger = require('./utils/logger')
const checkBearerToken = require('./utils/middleware/check-bearer-token')

const calendarRouter = require('./controllers/calendarController')
const emailRouter = require('./controllers/emailController')
const loginRouter = require('./controllers/loginController')
const registrationRouter = require('./controllers/registrationController')

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

app.set('trust proxy', '127.0.0.1')

app.use(helmet())
app.use(express.static('build'))
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())

app.use('/api/login', loginRouter)
app.use('/api/registration', registrationRouter)

app.use(checkBearerToken)

app.use('/api/calendar', calendarRouter)
app.use('/api/email', emailRouter)

app.get('/', (req, res) => {
  console.log('hello')
  res.send('Hello world!')
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (err, req, res, next) => {
  if (err.name === 'CastError') {
    return res.status(400).send({
      error: 'malformatted id',
    })
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
    })
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'invalid token',
    })
  }

  logger.error(err.message)

  return next(err)
}

app.use(errorHandler)

module.exports = app
