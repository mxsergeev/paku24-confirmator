import fees from '../data/fees.json' with { type: 'json' }
import services from '../data/services.json' with { type: 'json' }

function getAvailableFees(order) {
  const stairsFeeConfig = fees.find((fee) => fee.name === 'stairsFee')
  const baseFees = fees.filter((fee) => fee.name !== 'stairsFee').map((fee) => ({ ...fee }))

  if (!order || !order.service) return baseFees

  const service = services.find((item) => String(item.id) === String(order.service.id))
  const baseFee = Number(stairsFeeConfig?.baseFee)
  const startFloor = Number(stairsFeeConfig?.startFloor)
  const multiplier = Number(service?.multiplier)
  const floorFees = []

  if (
    !Number.isNaN(baseFee) &&
    !Number.isNaN(startFloor) &&
    !Number.isNaN(multiplier) &&
    multiplier > 0
  ) {
    const addresses = [order.address, order.destination, ...(order.extraAddresses || [])]

    addresses.forEach((address, index) => {
      if (!address || address.elevator || address.floor < startFloor) return

      const floorsAbove = Number(address.floor) - startFloor
      floorFees.push({
        name: `stairsFee_${index}`,
        label: `KERROSLISÄ ${address.street ? `(${address.street})` : ''}`,
        amount: floorsAbove * baseFee * multiplier,
      })
    })
  }

  return baseFees.concat(floorFees)
}

function calculateAutomaticFees(order) {
  const date = order?.date instanceof Date ? order.date : new Date(order?.date)
  const hour = date.getHours()
  const dayOfWeek = date.getDay()
  const dayOfMonth = date.getDate()
  const endOfMonth = [new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), 1]
  const weekendFeeApplicable = dayOfWeek === 6 || dayOfWeek === 0

  return getAvailableFees(order).filter((fee) => {
    if (fee.name === 'holidayFee') {
      // Currently not implemented
      return false
    }

    if (fee.name === 'weekendFee') {
      return weekendFeeApplicable
    }

    if (fee.name === 'startOrEndOfMonthFee') {
      return !weekendFeeApplicable && endOfMonth.includes(dayOfMonth)
    }

    if (fee.name === 'nightFee') {
      return hour < 8 || hour >= 20
    }

    if (fee.name === 'paymentTypeFee') {
      return Number(order?.paymentType?.fee) > 0
    }

    if (fee.name.startsWith('stairsFee')) {
      return true
    }

    return false
  })
}

export { calculateAutomaticFees, getAvailableFees }
