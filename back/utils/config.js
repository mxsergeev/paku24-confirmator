require('dotenv').config()

const MONGODB_URI =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_MONGODB_URI
    : process.env.MONGODB_URI

const {
  PORT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  SEMYSMS_API_TOKEN,
  DOMAIN_NAME,
  SOURCE_EMAIL,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  AT_EXPIRES_IN,
  RT_EXPIRES_IN,
  RT_REFRESH_AFTER_SEC,
} = process.env

module.exports = {
  PORT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  SEMYSMS_API_TOKEN,
  DOMAIN_NAME,
  SOURCE_EMAIL,
  MONGODB_URI,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  AT_EXPIRES_IN,
  RT_EXPIRES_IN,
  RT_REFRESH_AFTER_SEC,
}
