const loginRouter = require('express').Router()
const { PASSWORD } = require('../utils/config')

function checkPass(req, res, next) {
  const { pass } = req.body
  req.locals.isCorrect = pass === PASSWORD
  return next()
}

const requests = []

function controlRequestFlow(req, res, next) {
  const { ip } = req
  const { isCorrect } = req.locals

  const exists = requests.some((request) => request.ip === ip)

  if (!exists) requests.push({ ip, attempts: 0 })

  const currentReqIndex = requests.findIndex((request) => request.ip === ip)
  const currentRequest = requests[currentReqIndex]

  currentRequest.attempts += 1

  if (currentRequest.attempts > 3 && !isCorrect) {
    const throttleTime = 10000
    setTimeout(() => {
      currentRequest.attempts = 0
    }, throttleTime)

    return res.send({ message: 'Too many failed attempts.', throttleTime })
  }

  if (isCorrect) {
    currentRequest.attempts = 0
    return next()
  }

  return next()
}

loginRouter.post('/', checkPass, controlRequestFlow, (req, res) => {
  console.log(requests)

  const { isCorrect } = req.locals
  return res.status(200).send({ isCorrect })
})

module.exports = loginRouter
