function filterReqsBasedOnUrl(req, res, next) {
  const urls = ['/app', '/api', '/static', '/manifest', '/logo', '/favicon', '/robots']

  if (urls.some((url) => req.path.startsWith(url))) {
    return next()
  }

  return res.status(404)
}

module.exports = filterReqsBasedOnUrl
