const emailRouter = require('express').Router()

const sendMail = require('../utils/email/awsSES')
const termsData = require('../utils/data/terms.json')

function makeTerms(options) {
  if (options.hsy)
    return `${termsData[options.distance] + termsData.hsy}\n${
      termsData.defaultTerms
    }`

  return `${termsData[options.distance]}\n${termsData.defaultTerms}`
}

emailRouter.post('/', (req, res, next) => {
  const { email, confirmation, options } = req.body
  const subject = 'VARAUSVAHVISTUS'
  const terms = makeTerms(options)

  try {
    sendMail({
      email,
      subject,
      body: `VARAUSVAHVISTUS\n${confirmation}\n\nKIITOS VARAUKSESTANNE!\n\n${terms}`,
      confirmation: true,
    })
  } catch (err) {
    res.send({ error: err.message })
    next(err)
  }

  res.status(200).send('Email sent successfully')
})

emailRouter.get('/', (req, res) => {
  return res.status(200).send({ message: 'Test' })
})

module.exports = emailRouter
