import express from 'express'

import * as authMW from './authentication/auth.middleware.js'
import { clearSentCommunications, getSentCommunications } from './testCommunicationProvider.js'

const testCommunicationRouter = express.Router()

testCommunicationRouter.use(authMW.authenticateAccessToken)

testCommunicationRouter.get('/', (_req, res) => {
  res.status(200).send(getSentCommunications())
})

testCommunicationRouter.delete('/', (_req, res) => {
  clearSentCommunications()
  res.status(204).end()
})

export default testCommunicationRouter
