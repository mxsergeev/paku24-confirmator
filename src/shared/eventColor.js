import eventColorDefaults from '../data/eventColorDefaults.json' with { type: 'json' }
import colors, { DEFAULT_EVENT_COLOR_ID } from './colors.js'

function configuredColorId(value) {
  if (value === null || value === undefined || value === '') return null

  const colorId = String(value)
  return colors[colorId] ? colorId : null
}

function resolveEventColorId(order) {
  const explicitColorId = configuredColorId(order?.eventColor)
  if (explicitColorId) return explicitColorId

  const serviceColorId =
    configuredColorId(order?.service?.eventColor) ||
    configuredColorId(eventColorDefaults[order?.service?.name])

  return serviceColorId || DEFAULT_EVENT_COLOR_ID
}

export { resolveEventColorId }
