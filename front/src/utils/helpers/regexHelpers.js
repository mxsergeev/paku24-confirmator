export function cannotFind(str) {
  return `Cannot find ${str}. Invalid format.`
}

export function toConfirmationDateFormat(d) {
  const date = new Date(d)
  let dd = date.getDate()
  let mm = date.getMonth() + 1
  const yyyy = date.getFullYear()

  if (dd < 10) {
    dd = `0${dd}`
  }
  if (mm < 10) {
    mm = `0${mm}`
  }

  return `${dd}-${mm}-${yyyy}`
}

export function printFees(fees) {
  const activeFees = fees.filter((fee) => fee.value)

  const arrayOfFeeNames = activeFees.map((fee) => fee.name)

  const feesInText = activeFees
    .map((fee) => `\n${fee.name}\n${fee.value}€`)
    .reduce((acc, cur) => acc + cur, '')

  return { array: arrayOfFeeNames, string: feesInText }
}
