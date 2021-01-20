const loginRouter = require('express').Router()
const { PASSWORD } = require('../utils/config')

const requests = new Map()

function checkPass(req, res, next) {
  const { pass } = req.body
  req.isCorrect = pass === PASSWORD
  return next()
}

function controlRequestFlow(req, res, next) {
  const { isCorrect, ip } = req

  requests.forEach((reqData, reqIp) => {
    if (reqData.expires < Date.now()) requests.delete(reqIp)
  })

  const expireDate = () => Date.now() + 30 * 1000

  if (!requests.has(ip)) requests.set(ip, { attempts: 0, expires: expireDate() })

  const currentRequest = requests.get(ip)

  currentRequest.attempts += 1
  currentRequest.expires = expireDate()

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

  const { isCorrect } = req
  return res.status(200).send({ isCorrect })
})

module.exports = loginRouter
