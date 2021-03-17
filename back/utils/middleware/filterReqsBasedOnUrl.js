const newErrorWithCustomName = require('../helpers/newErrorWithCustomName')

function filterReqsBasedOnUrl(req, res, next) {
  const urls = ['/app', '/manifest.json', '/logo192.png', '/api', '/static']

  if (urls.some((url) => req.path.startsWith(url))) {
    return next()
  }

  return res.status(404)
}

module.exports = filterReqsBasedOnUrl
