const emailRouter = require('express').Router()

const sendMail = require('../utils/email/awsSES')
const termsData = require('../utils/data/terms.json')

function makeTerms(options) {
  if (options.hsy) return `${termsData[options.distance] + termsData.hsy}\n${termsData.defaultTerms}`

  return `${termsData[options.distance]}\n${termsData.defaultTerms}`
}

emailRouter.post('/', (req, res, next) => {
  const { email, confirmation, options } = req.body
  const subject = 'VARAUSVAHVISTUS'
  const terms = makeTerms(options)

  try {
    sendMail(email, subject, `${confirmation}\n\n${terms}`)
  } catch (err) {
    res.send({ error: err.message })
    next(err)
  }

  res.status(200).send('Email sent successfully')
})

module.exports = emailRouter
