/* eslint-disable camelcase */
const loginRouter = require('express').Router()
const { PASSWORD, DOMAIN_NAME } = require('../utils/config')
const sendMail = require('../utils/email/awsSES')

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

loginRouter.post('/request-access', (req, res) => {
  console.log('attempting to gain access')
  console.log(req.body)
  console.log(req.ip)
  console.log(req.query)
  console.log(DOMAIN_NAME)

  const { ip } = req
  const {
    name, surname, email, purpose,
  } = req.body
  const url = `${DOMAIN_NAME}/api/login/grant-access/?email=${email}&ip=${ip}`
  const text = `This person requested permission to use Paku24-Confirmator.
Details below:

Name: ${name}
Surname: ${surname}
Email: ${email}
Purpose: ${purpose}

To grant access click the link below:

<a href='${url}'>${url}</a>`

  sendMail('themaximsergeev@gmail.com', 'Request for access', text, 'maxim81388@gmail.com')
  return res.status(200).send({ message: 'Your request has been successfully sent.' })
  // return res.status(200).send({ message: text })
})

const ipWhitelist = new Map()

loginRouter.get('/grant-access', (req, res) => {
  const { email, ip } = req.query
  console.log('query', req.query)

  if (!ipWhitelist.has(ip)) {
    ipWhitelist.set(ip, {
      email,
      ips: [ip],
      accessGrantedOn: Date.now(),
      expired: false,
    })
  }

  console.log(ipWhitelist)

  res.status(200).send({ message: 'Status granted successfully.' })
})

function isAccessExpired(expiresAfter) {
  ipWhitelist.forEach((userAccessData, ip) => {
    if (userAccessData.accessGrantedOn + expiresAfter < Date.now()) {
      ipWhitelist.set(ip, { ...userAccessData, expired: true })
    }
  })
}

const expiresAfter_ms = 10 * 1000
const interval_ms = 1 * 1000

setInterval(() => {
  isAccessExpired(expiresAfter_ms)
  console.log(ipWhitelist)
}, interval_ms)

module.exports = loginRouter
