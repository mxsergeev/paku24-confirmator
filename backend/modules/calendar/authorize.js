import { authorize } from './calendar.helpers.js'
import * as logger from '../../utils/logger.js'

authorize()
  .then(() => logger.info('New Google Calendar token saved or an existing token used.'))
  .catch((err) => logger.error('Authorization failed. \n', err))
