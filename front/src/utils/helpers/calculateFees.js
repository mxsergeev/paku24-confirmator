export default function calculateFees(date, time, paymentType) {
  const timeInNumberType = time.split(':')[0] * 1

  const dayOFWeek = date.getDay()
  const weekEndFee =
    dayOFWeek === 6 || dayOFWeek === 7 || dayOFWeek === 0 ? 15 : false

  const dayOfMonth = date.getDate()
  const endOfMonth = [
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
    1,
  ]
  let endOfMonthFee = endOfMonth.includes(dayOfMonth) ? 15 : false

  if (weekEndFee) endOfMonthFee = false

  const morningFee = timeInNumberType < 8 ? 20 : false
  const nightFee = timeInNumberType > 20 ? 20 : false

  const paymentFee = paymentType === 'Lasku' ? 14 : false

  return [
    { value: weekEndFee, name: 'VIIKONLOPPULISÄ' },
    { value: endOfMonthFee, name: 'KUUNVAIHDELISÄ' },
    { value: morningFee, name: 'AAMULISÄ' },
    { value: nightFee, name: 'YÖLISÄ' },
    { value: paymentFee, name: 'LASKULISÄ' },
  ]
}
