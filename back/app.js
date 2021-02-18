const express = require('express')
const path = require('path')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const morgan = require('morgan')
const mongoose = require('mongoose')

const config = require('./utils/config')
const logger = require('./utils/logger')
const errorHandler = require('./utils/middleware/errorHandler')
const { authenticateAccessToken } = require('./utils/middleware/authentication')

const calendarRouter = require('./controllers/calendarController')
const emailRouter = require('./controllers/emailController')
const loginRouter = require('./controllers/authentication/loginController')
const logoutRouter = require('./controllers/authentication/logoutController')
const registrationRouter = require('./controllers/authentication/registrationController')
const tokenRouter = require('./controllers/authentication/tokenController')
const testRouter = require('./controllers/testController')

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

app.use(express.static(path.join(__dirname, 'build')))

app.set('trust proxy', '127.0.0.1')

app.use(helmet())
app.use(express.static('build'))
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.use('/api/token', tokenRouter)
app.use('/api/login', loginRouter)
app.use('/api/logout', logoutRouter)
app.use('/api/registration', registrationRouter)

app.use(authenticateAccessToken)

app.use('/api/test', testRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/email', emailRouter)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/build/index.html'))
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

app.use(errorHandler)

module.exports = app
