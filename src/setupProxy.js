const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: `${process.env.DEV_FRONTEND_PROXY}:${process.env.BACKEND_PORT}`,
      changeOrigin: true,
    })
  )
}
