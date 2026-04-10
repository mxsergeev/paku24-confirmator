import termsData from './email.data.terms.json' with { type: 'json' }
import dayjs from '../../../src/shared/dayjs.js'

/**
 * @param {object} order
 * @param {boolean} order.hsy
 * @param {string} order.distance
 */

function makeTerms(order) {
  if (order.hsy)
    return `${termsData[order.distance]}\n\n${termsData.hsy}\n\n${termsData.defaultTerms}`

  return `${termsData[order.distance]}\n\n${termsData.defaultTerms}`
}

function resolveEmailLanguage(lang = 'fi') {
  const normalized = String(lang || '')
    .trim()
    .toLowerCase()

  if (normalized.startsWith('en')) {
    return 'en'
  }

  return 'fi'
}

const confirmationCopy = {
  fi: {
    subject: 'VARAUSVAHVISTUS',
    heading: 'Varausvahvistus',
    intro: 'Varauksesi on vahvistettu.',
    intro2: 'Alta löydät varauksesi tiedot.',
    date: 'Päivämäärä',
    service: 'Palvelu',
    duration: 'Kesto',
    startLocation: 'Lähtöpaikka',
    endLocation: 'Määränpää',
    extraAddress: 'Lisäpysähdykset',
    paymentName: 'Maksutapa',
    paymentFee: 'Maksutapalisä',
    totalPrice: 'Arvioitu hinta',
    name: 'Nimi',
    email: 'Sähköposti',
    phone: 'Puhelin',
    comment: 'Lisätiedot',
    movingBoxes: 'Muuttolaatikot',
    amount: 'Määrä',
    price: 'Hinta',
    deliveryDate: 'Toimituspäivä',
    returnDate: 'Palautuspäivä',
    floor: 'kerros',
    elevator: 'hissi',
    yes: 'kyllä',
    no: 'ei',
    termsTitle: 'Ehdot',
    thanks: 'Kiitos varauksestasi!',
    hourShort: 'h',
  },
  en: {
    subject: 'BOOKING CONFIRMATION',
    heading: 'Booking confirmation',
    intro: 'Your booking is confirmed.',
    intro2: 'Please find your reservation information below.',
    date: 'Date',
    service: 'Service',
    duration: 'Duration',
    startLocation: 'Start location',
    endLocation: 'Destination',
    extraAddress: 'Extra stops',
    paymentName: 'Payment method',
    paymentFee: 'Payment fee',
    totalPrice: 'Estimated price',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    comment: 'Comment',
    movingBoxes: 'Moving boxes',
    amount: 'Amount',
    price: 'Price',
    deliveryDate: 'Delivery date',
    returnDate: 'Return date',
    floor: 'floor',
    elevator: 'elevator',
    yes: 'yes',
    no: 'no',
    termsTitle: 'Terms',
    thanks: 'Thank you for choosing our service!',
    hourShort: 'h',
  },
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function toHtmlWithBreaks(value) {
  return escapeHtml(value).replaceAll('\n', '<br>')
}

function hasValue(value) {
  if (value === 0) return true
  return Boolean(value)
}

function formatDate(date, lang) {
  if (!date) return ''
  const d = dayjs(date)
  if (!d.isValid()) return ''
  return lang === 'en' ? d.format('YYYY-MM-DD HH:mm') : d.format('DD.MM.YYYY HH:mm')
}

function formatAddress(address, t) {
  if (!address || typeof address !== 'object') return ''

  const street = address.street || ''
  const index = address.index || ''
  const city = address.city || ''
  const base = [street, index, city].filter(Boolean).join(' ')

  const floorPart =
    address.floor === null || address.floor === undefined || address.floor === ''
      ? ''
      : `${address.floor}. ${t.floor}`

  const elevatorPart = `${t.elevator}: ${address.elevator ? t.yes : t.no}`

  return [base, floorPart, elevatorPart].filter(Boolean).join(', ')
}

function makeRow(label, value, extraStyle = '') {
  if (!hasValue(value)) return ''

  return `
    <tr>
      <td style="text-align:left;padding:10px;border-bottom:1px solid #cccccc;${extraStyle}"><strong>${escapeHtml(label)}:</strong></td>
      <td style="text-align:right;padding:10px;border-bottom:1px solid #cccccc;${extraStyle}">${escapeHtml(value)}</td>
    </tr>`
}

function makeBlockRow(label, htmlValue, extraStyle = '') {
  if (!hasValue(htmlValue)) return ''

  return `
    <tr>
      <td style="text-align:left;padding:10px;border-bottom:1px solid #cccccc;vertical-align:top;${extraStyle}"><strong>${escapeHtml(label)}:</strong></td>
      <td style="text-align:right;padding:10px;border-bottom:1px solid #cccccc;${extraStyle}">${htmlValue}</td>
    </tr>`
}

function buildConfirmationEmail({ order = {}, orderDetails = '', terms = '', lang = 'fi' } = {}) {
  const locale = resolveEmailLanguage(lang)
  const t = confirmationCopy[locale]

  const serviceName = order?.service?.name || order?.serviceName || ''
  const paymentName = order?.paymentType?.name || ''
  const paymentFee = Number(order?.paymentType?.fee || 0)
  const paymentFeeText = paymentFee > 0 ? `${paymentFee}€` : ''
  const totalPriceText = hasValue(order?.price) ? `${Number(order.price)}€` : ''
  const durationText = hasValue(order?.duration) ? `${order.duration}${t.hourShort}` : ''
  const dateText = formatDate(order?.date, locale)
  const dateTextWithTolerance = dateText ? `${dateText} (±15min)` : ''

  const startAddressText = formatAddress(order?.address, t)
  const destinationAddressText = formatAddress(order?.destination, t)

  const extraAddresses = Array.isArray(order?.extraAddresses) ? order.extraAddresses : []
  const extraAddressesHtml = extraAddresses
    .map((address, index) => {
      const formatted = formatAddress(address, t)
      if (!formatted) return ''
      return `<div style="margin-bottom:3px;">${index + 1}. ${escapeHtml(formatted)}</div>`
    })
    .filter(Boolean)
    .join('')

  const boxesAmount = Number(order?.boxes?.amount || 0)
  const boxesHtml =
    boxesAmount > 0
      ? [
          `<div style="margin-bottom:3px;">${escapeHtml(t.amount)}: ${escapeHtml(boxesAmount)}</div>`,
          hasValue(order?.boxesPrice)
            ? `<div style="margin-bottom:3px;">${escapeHtml(t.price)}: ${escapeHtml(Number(order.boxesPrice))}EUR</div>`
            : '',
          order?.boxes?.deliveryDate
            ? `<div style="margin-bottom:3px;">${escapeHtml(t.deliveryDate)}: ${escapeHtml(formatDate(order.boxes.deliveryDate, locale))}</div>`
            : '',
          order?.boxes?.returnDate
            ? `<div style="margin-bottom:3px;">${escapeHtml(t.returnDate)}: ${escapeHtml(formatDate(order.boxes.returnDate, locale))}</div>`
            : '',
        ]
          .filter(Boolean)
          .join('')
      : ''

  const termsHtml = terms
    ? `<div style="white-space:pre-line;">${toHtmlWithBreaks(terms)}</div>`
    : ''
  const termsRowHtml = termsHtml
    ? `
    <tr>
      <td colspan="2" style="text-align:left;padding:10px;border-bottom:1px solid #cccccc;">
        <div style="margin-bottom:8px;"><strong>${escapeHtml(t.termsTitle)}:</strong></div>
        <div>${termsHtml}</div>
      </td>
    </tr>`
    : ''

  const paymentAdditionalLabel = order?.paymentType?.additionalFieldLabel || ''
  const paymentAdditionalValue = order?.paymentType?.additionalFieldValue || ''

  const body = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        table, tbody, tr, td {
          display: block !important;
          width: 100% !important;
        }
        tr {
          border: 1px solid #cccccc !important;
          margin-bottom: 10px !important;
          border-radius: 5px !important;
          overflow: hidden !important;
        }
        td {
          border: none !important;
          padding: 8px 12px !important;
          text-align: left !important;
        }
        td:first-child {
          border-bottom: 1px solid #dddddd !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:10px;font-family:Roboto,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;">
      <h1 style="text-align:center;">${escapeHtml(t.heading)}</h1>
      <p style="margin:20px 0 8px 0;">${escapeHtml(t.intro)}</p>
      <p style="margin:0 0 20px 0;">${escapeHtml(t.intro2)}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${makeRow(t.date, dateTextWithTolerance, 'border-top:1px solid #cccccc;')}
        ${makeRow(t.service, serviceName)}
        ${makeRow(t.duration, durationText)}
        ${makeRow(t.startLocation, startAddressText)}
        ${makeBlockRow(t.extraAddress, extraAddressesHtml)}
        ${makeRow(t.endLocation, destinationAddressText)}
        ${makeRow(t.paymentName, paymentName)}
        ${makeRow(t.paymentFee, paymentFeeText)}
        ${makeRow(paymentAdditionalLabel, paymentAdditionalValue)}
        ${makeRow(t.totalPrice, totalPriceText)}
        ${makeRow(t.name, order?.name)}
        ${makeRow(t.email, order?.email)}
        ${makeRow(t.phone, order?.phone)}
        ${makeBlockRow(t.movingBoxes, boxesHtml)}
        ${makeRow(t.comment, order?.comment)}
        ${termsRowHtml}
      </table>
      <p style="margin:20px 0;">${escapeHtml(t.thanks)}</p>
    </div>
  </body>
</html>`

  return {
    subject: t.subject,
    body,
    locale,
  }
}

export { makeTerms, resolveEmailLanguage, buildConfirmationEmail }
