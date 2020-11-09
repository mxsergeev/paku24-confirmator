/* eslint-disable no-control-regex */
/* eslint-disable no-useless-escape */
import { services } from './servicesData'

console.log(services)

function cannotFind(str) {
  return `Cannot find ${str}. Invalid format.`
}

export function getStartingTime(str) {
  const dateRegex = /(?<=Date end time: \w+, )\w+ \d+(th|rd|st)? \w+/.exec(str)

  if (!dateRegex) throw new Error(cannotFind('date'))

  const originalDate = new Date(dateRegex[0].replace(/th|rd|st/, ''))
  const date = originalDate
    .toLocaleDateString()
    .replace(/\./g, '-')
  const time = /\d+:\d+/.exec(str)[0]
  const timeNumber = /\d+/.exec(time)[0]


  return { date, originalDate, time, timeNumber }
}

export function getDuration(str) {
  const duration = /\d+(\.\d+)?(?=\sh.)/.exec(str)

  if(!duration) throw new Error(cannotFind('duration'))

  return duration[0]
}

export function getFees(str) {
  const date = getStartingTime(str).originalDate

  const dayOFWeek = date.getDay()
  const weekEndFee = dayOFWeek === 6 || dayOFWeek === 7 ? 15 : false

  const dayOfMonth = date.getDate()
  const endOfMonth = [ new Date(date.getFullYear(), date.getMonth()+1, 0).getDate(), 1 ]
  let endOfMonthFee = endOfMonth.includes(dayOfMonth) ? 15 : false

  if (weekEndFee) endOfMonthFee = false

  const time = getStartingTime(str).timeNumber
  const morningFee = time < 8 ? 20 : false
  const nightFee = time > 20 ? 20 : false

  return [ 
    { value: weekEndFee, name: 'VIIKONLOPPULISÄ' }, 
    { value: endOfMonthFee, name: 'KUUNVAIHDELISÄ' }, 
    { value: morningFee, name: 'AAMULISÄ' }, 
    { value: nightFee, name: 'YÖLISÄ' } 
  ]
}

export function getService(str) {
  let price = /(?<=PRICE: )\d+/.exec(str)

  if (!price) throw new Error(cannotFind('price'))
  
  price = price[0]
  getFees(str)
    .filter(fee => fee.value !== false)
    .forEach(fee => price = price - fee.value)

  if (getPaymentType(str).name === 'Lasku') price = price - getPaymentType(str).fee

  console.log("PRICE:", price)
  const duration = getDuration(str)
  console.log("DURATION:", duration)

  const service = services.filter(service => service.price === price / duration)

  if (service.length === 0) throw new Error('Cannot recognize service. Invalid price or duration.')

  return service[0]
}

export function getPaymentType(str) {
  let paymentType = /(?<=Payment Type: )[A-Öa-ö]+/.exec(str)

  if (!paymentType) throw new Error(cannotFind('payment type'))

  paymentType = { name: paymentType[0] }
  paymentType.fee = paymentType.name === "Lasku" ? 14 : false
  paymentType.fee ? paymentType.comment = `(Laskulisä ${paymentType.fee}€)` : paymentType.comment = null

  return paymentType
}

export function getAdress(str, course) {
  const city = new RegExp(`(?<=${course}: )[A-Öa-ö]+`).exec(str)
    ? new RegExp(`(?<=${course}: )[A-Öa-ö]+`).exec(str)[0]
    : ''
  const reg = new RegExp(`(?<=${course}: ${city} / ).*(?=,*)`).exec(str)
  const adress = reg ? `${reg[0]},` : ''

  if (course === 'Frome' && !adress) throw new Error(cannotFind('adress'))

  return { adress, city }
}

export function getName(str) {
  const name = /(?<=Name: )([A-Öa-ö]+ *)+/.exec(str)

  if (!name) throw new Error(cannotFind('name'))

  return name[0]
}

export function getEmail(str) {
  const email = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.exec(str)

  if (!email) throw new Error(cannotFind('email'))

  return email[0]
}

export function getPhone(str) {
  const phone = /(?<=Phone: )[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*/.exec(str)

  if (!phone) throw new Error(cannotFind('phone'))

  return phone[0].replace(/\n/, '')
}

export function getComment(str) {
  const re = /(?<=Comment: )(.*\s*)*/
  const comment = re.exec(str) ? `\n${re.exec(str)[0]}\n` : ''

  return comment
}

export function printFee(fee) {
  return `\n${fee.name}\nKyllä, ${fee.value}€`
}