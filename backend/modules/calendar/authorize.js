const { authorize } = require('./calendar.helpers')
const logger = require('../../utils/logger')

authorize()
  .then(() => logger.info('New Google Calendar token saved or an existing token used.'))
  .catch((err) => logger.error('Authorization failed. \n', err))
