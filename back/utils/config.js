require('dotenv').config()

const {
  PORT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  PASSWORD,
  SEMYSMS_API_TOKEN,
} = process.env

module.exports = {
  PORT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  PASSWORD,
  SEMYSMS_API_TOKEN,
}
