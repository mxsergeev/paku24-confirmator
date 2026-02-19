import express from 'express'
import path from 'path'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import morgan from 'morgan'
import mongoose from 'mongoose'

import * as config from './utils/config.js'
import * as logger from './utils/logger.js'
import errorHandler from './utils/errorHandler.middleware.js'
import filterReqsBasedOnUrl from './utils/filterReqsBasedOnUrl.middleware.js'

import calendarRouter from './modules/calendar/calendar.controller.js'
import emailRouter from './modules/email/email.controller.js'
import orderPoolRouter from './modules/orderPool/orderPool.controller.js'
import smsRouter from './modules/sms/sms.controller.js'
import loginRouter from './modules/authentication/auth.login.controller.js'
import logoutRouter from './modules/authentication/auth.logout.controller.js'
import registrationRouter from './modules/authentication/auth.registration.controller.js.js'
import tokenRouter from './modules/authentication/auth.token.controller.js'

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

// When using helmet in developemnt, it will force HTTPS which doesn't work without creating an ssl certificate
// Because of that it is disabled in development
if (process.env.NODE_ENV === 'production') {
  app.use(helmet())
}

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

app.use(express.static(path.join(import.meta.dirname, '..', 'build')))
app.get('/app*', (req, res) => {
  res.sendFile(path.join(import.meta.dirname, '..', '/build/index.html'))
})

app.use(errorHandler)

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'Unknown endpoint' })
}

app.use(unknownEndpoint)

export default app
