const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const mongoose = require('mongoose')

const config = require('./utils/config')
const logger = require('./utils/logger')

const calendarRouter = require('./controllers/calendarController')
const emailRouter = require('./controllers/emailController')
const loginRouter = require('./controllers/loginController')
const registrationRouter = require('./controllers/registrationController')

mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true,
})
  .then(() => {
    logger.info('Connected to MongoDB.')
  })
  .catch((err) => {
    logger.error('Error connecting to MongoDB:', err.message)
  })

const app = express()

app.use(express.static('build'))

app.set('trust proxy', '127.0.0.1')

app.use(morgan('dev'))
app.use(cors())
app.use(express.json())

app.use('/api/calendar', calendarRouter)
app.use('/api/email', emailRouter)
app.use('/api/login', loginRouter)
app.use('/api/registration', registrationRouter)

app.get('/', (req, res) => {
  console.log('hello')
  res.send('Hello world!')
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

module.exports = app
