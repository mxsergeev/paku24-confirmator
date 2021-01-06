const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const calendarRouter = require('./controllers/calendarController')
const emailRouter = require('./controllers/emailController')
const loginRouter = require('./controllers/loginController')
const smsRouter = require('./controllers/smsController')

const app = express()

app.use(express.static('build'))

app.set('trust proxy', '127.0.0.1')

app.use(morgan('dev'))
app.use(cors())
app.use(express.json())

app.use('/api/calendar', calendarRouter)
app.use('/api/email', emailRouter)
app.use('/api/login', loginRouter)
app.use('/api/sms', smsRouter)

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

function errorHandler(err, req, res, next) {
  console.error(err.stack)
  res.status(500).send({ error: 'Something broke...' })
}

app.use(errorHandler)

module.exports = app
