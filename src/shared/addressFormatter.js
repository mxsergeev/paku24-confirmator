/**
 * Helpers for formatting address objects into strings.
 */

function formatAddress(address) {
  let result = ''
  if (!address) return result
  result += address.street || ''
  if (address.index || address.city) {
    result += `, ${address.index || ''} ${address.city || ''}`.trim()
  }
  // Include floor and elevator info on a separate line for clarity
  const floorInfo = []
  if (typeof address.floor !== 'undefined' && address.floor !== null && address.floor !== '') {
    floorInfo.push(`${address.floor} krs.`)
  }
  if (address.elevator) {
    floorInfo.push('hissi')
  }
  if (floorInfo.length > 0) {
    result += '\n' + floorInfo.join(', ')
  }
  result += '\n'
  return result
}

function formatAddressLocation(address) {
  if (!address) return ''
  let result = ''
  result += address.street || ''
  if (address.index || address.city) {
    result += `, ${address.index || ''} ${address.city || ''}`.trim()
  }
  result += '\n'
  return result
}

export { formatAddress, formatAddressLocation }
