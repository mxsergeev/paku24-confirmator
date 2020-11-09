const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
// const calendarRouter = require('./controllers/calendar')
// const emailRouter = require('./controllers/email')
// const notesRouter = require('./controllers/notes')

const app = express()

app.use(cors())
app.use(express.json())
morgan('small')
// app.use('/api/calendar', calendarRouter)
// app.use('/api/email', emailRouter)
// app.use('/api/notes', notesRouter)

app.get('/', (req, res) => {
  res.send('Hello world!')
})

module.exports = app
