import express from 'express'
import * as authMW from './authentication/auth.middleware.js'
import { clear, failNext, getEvents } from './calendar/testCalendarProvider.js'

const router = express.Router()
router.use(authMW.authenticateAccessToken)

router.get('/', (req, res) => res.status(200).send({ events: getEvents() }))
router.delete('/', (req, res) => {
  clear()
  return res.status(204).end()
})
router.post('/fail-next', (req, res, next) => {
  try {
    failNext(req.body?.operation, {
      afterWrite: Boolean(req.body?.afterWrite),
      status: req.body?.status || 503,
    })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

export default router
