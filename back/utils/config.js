require('dotenv').config()

const {
  PORT,
  EMAIL,
  EMAIL_PASSWORD,
} = process.env

module.exports = {
  PORT,
  EMAIL,
  EMAIL_PASSWORD,
}
