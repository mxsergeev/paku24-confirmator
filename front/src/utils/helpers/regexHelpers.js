export function cannotFind(str) {
  return `Cannot find ${str}. Invalid format.`
}

export function toConfirmationDateFormat(date) {
  return new Date(date).toLocaleDateString().replace(/\.|\//g, '-')
}

export function printFees(fees) {
  const activeFees = fees.filter(fee => fee.value)

  const arrayOfFeeNames = activeFees.map(fee => fee.name)
  
  const feesInText = activeFees
    .map(fee => `\n${fee.name}\n${fee.value}€`)
    .reduce((acc, cur) => acc + cur, '')

  return { array: arrayOfFeeNames, string: feesInText }
}