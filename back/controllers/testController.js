const testRouter = require('express').Router()

testRouter.post('/', (req, res) => {
  res.send({ msg: 'ok' })
})

module.exports = testRouter
