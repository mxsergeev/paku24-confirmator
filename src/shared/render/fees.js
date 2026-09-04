import feesConfig from '../../data/fees.json' with { type: 'json' }

const STAIRS_FEE_BASE_NAME = 'stairsFee'

const DEFAULT_FEE_LABELS = feesConfig.reduce((acc, fee) => {
  if (!fee?.name) return acc
  acc[fee.name] = fee.label || fee.name
  return acc
}, {})

const STAIRS_START_FLOOR = Number(
  feesConfig.find((fee) => fee?.name === STAIRS_FEE_BASE_NAME)?.startFloor,
)
const STAIRS_UNIT_BRUTTO = Number(
  feesConfig.find((fee) => fee?.name === STAIRS_FEE_BASE_NAME)?.baseFee,
)

const FEE_LABEL_OVERRIDES = {
  paymentTypeFee: 'Laskutuslisä',
}

function getFeeBaseName(feeName) {
  if (String(feeName).startsWith(`${STAIRS_FEE_BASE_NAME}_`)) return STAIRS_FEE_BASE_NAME
  return String(feeName || '')
}

function getAddressForStairsFee(order, feeName) {
  const match = String(feeName || '').match(/^stairsFee_(\d+)$/)
  if (!match) return null

  const addressIndex = Number(match[1])
  if (!Number.isFinite(addressIndex)) return null

  const addresses = [order.address, order.destination, ...order.extraAddresses]
  return addresses[addressIndex] || null
}

function getStairsFloorCount(order, feeName) {
  if (!Number.isFinite(STAIRS_START_FLOOR)) return 0

  const address = getAddressForStairsFee(order, feeName)
  const floor = Number(address?.floor)
  if (!Number.isFinite(floor)) return 0

  return Math.max(0, floor - STAIRS_START_FLOOR)
}

function getStairsPaidFloorCount(order, feeName, feeBrutto) {
  if (Number.isFinite(STAIRS_UNIT_BRUTTO) && STAIRS_UNIT_BRUTTO > 0) {
    return Math.round((Number(feeBrutto) / STAIRS_UNIT_BRUTTO) * 100) / 100
  }

  return getStairsFloorCount(order, feeName)
}

function toLabelCase(text) {
  const source = String(text || '').trim()
  if (!source) return ''

  return source
    .toLocaleLowerCase('fi-FI')
    .replace(/(^|[\s\-/])(\p{L})/gu, (match, separator, letter) => {
      return `${separator}${letter.toLocaleUpperCase('fi-FI')}`
    })
}

function resolveFeeDisplayName(order, fee) {
  const feeName = String(fee?.name || '')
  const baseName = getFeeBaseName(feeName)

  if (fee?.label) return toLabelCase(fee.label)

  const customLabel = FEE_LABEL_OVERRIDES[feeName] || FEE_LABEL_OVERRIDES[baseName]
  if (customLabel) return toLabelCase(customLabel)

  if (baseName === STAIRS_FEE_BASE_NAME) {
    const address = getAddressForStairsFee(order, feeName)
    const floorCount = getStairsFloorCount(order, feeName)
    return toLabelCase(
      `${DEFAULT_FEE_LABELS[baseName] || baseName} (${address?.street || ''}, ${floorCount} floors)`,
    )
  }

  const resolvedLabel =
    DEFAULT_FEE_LABELS[feeName] || DEFAULT_FEE_LABELS[baseName] || feeName || 'Lisämaksu'

  return toLabelCase(resolvedLabel)
}

export {
  getFeeBaseName,
  getAddressForStairsFee,
  getStairsFloorCount,
  getStairsPaidFloorCount,
  resolveFeeDisplayName,
}
