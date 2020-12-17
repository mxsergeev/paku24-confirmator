const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const calendarRouter = require('./controllers/calendarController')
const emailRouter = require('./controllers/emailController')
const loginRouter = require('./controllers/loginController')

const app = express()

app.use(express.static('build'))

app.use(morgan('dev'))
app.use(cors())
app.use(express.json())
app.use('/api/calendar', calendarRouter)
app.use('/api/email', emailRouter)
app.use('/api/login', loginRouter)

app.get('/', (req, res) => {
  console.log('hello')
  res.send('Hello world!')
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

module.exports = app
