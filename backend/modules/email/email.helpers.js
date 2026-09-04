import termsData from './email.data.terms.json' with { type: 'json' }
import { formatHelsinkiInstant } from '../../../src/shared/date-fns-tz.js'
import { SOURCE_EMAIL, COMPANY_PHONE } from '../../utils/config.js'
import { getOrderPricing } from '../../../src/shared/orderPricing.js'

const styles = {
  colors: {
    bg: '#f4f6f8',
    white: '#ffffff',
    dark: '#1a1a1a',
    gray: '#666666',
    midGray: '#555555',
    border: '#f2f2f2',
    orange: '#f37021',
    containerBorder: '#e1e4e8',
  },
  fonts: {
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
}

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
    greeting: 'Hei %s,',
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
    pcs: 'kpl',
    thanks: 'Kiitos varauksestasi!',
    hourShort: 'h',
  },
  en: {
    subject: 'BOOKING CONFIRMATION',
    greeting: 'Hi %s,',
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
    pcs: 'pcs',
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

function formatDate(value, lang, fieldName = 'date', hasTime = true) {
  if (!value) return ''

  if (!hasTime) {
    const [year, month, day] = formatHelsinkiInstant(value, 'yyyy-MM-dd', fieldName).split('-')
    return lang === 'en' ? `${year}-${month}-${day}` : `${day}.${month}.${year}`
  }

  try {
    return formatHelsinkiInstant(
      value,
      lang === 'en' ? 'yyyy-MM-dd HH:mm' : 'dd.MM.yyyy HH:mm',
      fieldName,
    )
  } catch {
    return ''
  }
}

function renderAddressHtml(address, t) {
  if (!address || typeof address !== 'object') return ''
  const street = address.street || ''
  const index = address.index || ''
  const city = address.city || ''
  const base = escapeHtml([street, index, city].filter(Boolean).join(', '))

  const floor = address.floor ?? ''
  const elevator = address.elevator ? t.yes : t.no
  const details = []
  if (floor !== '') details.push(`${floor}. ${t.floor}`)
  details.push(`${t.elevator}: ${elevator}`)
  const detailsHtml = `<span style="font-size:13px;color:${styles.colors.gray};">${escapeHtml(details.join(', '))}</span>`

  return `<span>${base}</span><br>${detailsHtml}`
}

function renderExtraStopsHtml(addresses, t) {
  if (!Array.isArray(addresses) || addresses.length === 0) return ''
  let html = '<div style="margin:0;">'
  for (const addr of addresses) {
    const addrHtml = renderAddressHtml(addr, t)
    if (!addrHtml) continue
    html += `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:8px;width:100%;">
      <tr>
        <td style="width:12px;max-width:12px;vertical-align:top;font-size:14px;color:#888888;padding-right:6px;line-height:1.5;">&bull;</td>
        <td style="vertical-align:top;font-size:14px;color:${styles.colors.dark};line-height:1.5;word-break:break-word;">${addrHtml}</td>
      </tr>
    </table>`
  }
  html += '</div>'
  return html
}

function renderBoxesHtml(boxes, boxesPrice, t, locale) {
  const amount = Number(boxes?.amount || 0)
  if (amount <= 0) return ''

  let html = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:13px;font-weight:normal;color:${styles.colors.midGray};width:100%;">
      <tr><td style="padding:2px 0;">${escapeHtml(t.amount)}: ${escapeHtml(amount)} ${escapeHtml(t.pcs)}</td></tr>`

  if (hasValue(boxesPrice)) {
    html += `<tr><td style="padding:2px 0;">${escapeHtml(t.price)}: ${escapeHtml(Number(boxesPrice))} €</td></tr>`
  }

  const deliveryDate = boxes?.deliveryDate
  if (deliveryDate) {
    html += `<tr><td style="padding:2px 0;">${escapeHtml(t.deliveryDate)}: ${escapeHtml(formatDate(deliveryDate, locale, 'box delivery date', boxes.deliveryHasTime))}</td></tr>`
  }

  const returnDate = boxes?.returnDate
  if (returnDate) {
    html += `<tr><td style="padding:2px 0;">${escapeHtml(t.returnDate)}: ${escapeHtml(formatDate(returnDate, locale, 'box return date', boxes.returnHasTime))}</td></tr>`
  }

  html += '</table>'
  return html
}

function renderTermsHtml(terms) {
  if (!terms) return ''
  return `<div style="font-size:12px;color:#999999;line-height:1.5;white-space:pre-line;">${toHtmlWithBreaks(terms)}</div>`
}

function renderThanksHtml(t) {
  return `<p style="margin:40px 0 16px 0;text-align:left;font-size:14px;color:${styles.colors.midGray};line-height:1.5;">${escapeHtml(t.thanks)}</p>`
}

function renderCompanyInfoHtml() {
  const email = SOURCE_EMAIL || ''
  const phone = COMPANY_PHONE || ''
  let html = `<p style="margin:8px 0 0 0;text-align:left;"><strong style="color:${styles.colors.orange};font-size:16px;display:block;margin-bottom:8px;">Paku24</strong>`
  if (email) {
    html += `<span style="font-size:13px;color:${styles.colors.gray};line-height:1.6;display:block;"><a href="mailto:${escapeHtml(email)}" style="color:${styles.colors.gray};text-decoration:none;border:none;outline:none;">${escapeHtml(email)}</a></span>`
  }
  if (phone) {
    html += `<span style="font-size:13px;color:${styles.colors.gray};line-height:1.6;display:block;"><a href="tel:${escapeHtml(phone.replace(/\s/g, ''))}" style="color:${styles.colors.gray};text-decoration:none;border:none;outline:none;">${escapeHtml(phone)}</a></span>`
  }
  html += `<span style="font-size:13px;color:${styles.colors.gray};line-height:1.6;display:block;"><a href="https://paku24.fi" style="color:${styles.colors.gray};text-decoration:none;border:none;outline:none;">paku24.fi</a></span>`
  html += '</p>'
  return html
}

function makeRow(label, value, { isHtml = false, extraStyle = '', hasBorder = true } = {}) {
  if (!hasValue(value)) return ''
  const borderStyle = hasBorder ? `border-bottom:1px solid ${styles.colors.border};` : 'border-bottom:none;'
  const valueContent = isHtml ? value : escapeHtml(value)
  return `
    <tr>
      <td class="label-col" style="width:32%;text-align:left;vertical-align:top;padding:12px 0;font-size:14px;font-weight:normal;color:${styles.colors.gray};${borderStyle}"><p style="margin:0;">${escapeHtml(label)}</p></td>
      <td class="value-col" style="width:68%;text-align:left;vertical-align:top;padding:12px 0 12px 15px;font-size:14px;font-weight:normal;color:${styles.colors.dark};line-height:1.5;word-break:break-word;${borderStyle}${extraStyle}">${isHtml ? valueContent : `<p style="margin:0;">${valueContent}</p>`}</td>
    </tr>`
}

function buildConfirmationEmail({ order = {}, terms = '', lang = 'fi' } = {}) {
  const locale = resolveEmailLanguage(lang)
  const t = confirmationCopy[locale]
  const pricing = getOrderPricing(order)

  const firstName = (order?.name || '').split(' ')[0]

  const serviceName = order?.service?.name || order?.serviceName || ''
  const paymentName = order?.paymentType?.name || ''
  const paymentFee = Number(
    pricing.fees.find((fee) => fee?.name === 'paymentTypeFee')?.amount || 0,
  )
  const paymentFeeText = paymentFee > 0 ? `${paymentFee}€` : ''
  const totalPriceText = hasValue(pricing.price) ? `${Number(pricing.price)}€` : ''
  const durationText = hasValue(order?.duration) ? `${order.duration}${t.hourShort}` : ''
  const dateText = formatDate(order?.date, locale, 'order date')
  const dateTextWithTolerance = dateText ? `${dateText} (±15min)` : ''

  const startAddressHtml = renderAddressHtml(order?.address, t)
  const destinationAddressHtml = renderAddressHtml(order?.destination, t)
  const extraStopsHtml = renderExtraStopsHtml(order?.extraAddresses, t)
  const boxesHtml = renderBoxesHtml(order?.boxes, pricing.boxesPrice, t, locale)
  const thanksHtml = renderThanksHtml(t)
  const termsHtml = renderTermsHtml(terms)
  const companyInfoHtml = renderCompanyInfoHtml()

  const paymentAdditionalLabel = order?.paymentType?.additionalFieldLabel || ''
  const paymentAdditionalValue = order?.paymentType?.additionalFieldValue || ''

  const rows = []

  rows.push({ label: t.date, value: dateTextWithTolerance, extraStyle: 'font-weight:600;' })
  rows.push({ label: t.service, value: serviceName, extraStyle: 'font-weight:600;' })
  rows.push({ label: t.duration, value: durationText })
  rows.push({ label: t.startLocation, value: startAddressHtml, isHtml: true })
  if (extraStopsHtml) {
    rows.push({ label: t.extraAddress, value: extraStopsHtml, isHtml: true })
  }
  rows.push({ label: t.endLocation, value: destinationAddressHtml, isHtml: true })
  rows.push({ label: t.name, value: order?.name })
  rows.push({ label: t.email, value: order?.email })
  rows.push({ label: t.phone, value: order?.phone })
  rows.push({ label: t.paymentName, value: paymentName })
  if (paymentFeeText) {
    rows.push({ label: t.paymentFee, value: paymentFeeText })
  }
  if (paymentAdditionalLabel) {
    rows.push({ label: paymentAdditionalLabel, value: paymentAdditionalValue })
  }
  rows.push({ label: t.totalPrice, value: totalPriceText, extraStyle: `color:${styles.colors.orange};font-size:16px;font-weight:700;` })
  if (boxesHtml) {
    rows.push({ label: t.movingBoxes, value: boxesHtml, isHtml: true })
  }
  if (hasValue(order?.comment)) {
    rows.push({ label: t.comment, value: order.comment, extraStyle: `font-style:italic;color:${styles.colors.midGray};` })
  }

  const rowsHtml = rows.map((row, i) => {
    const hasBorder = i !== rows.length - 1
    return makeRow(row.label, row.value, { isHtml: row.isHtml || false, extraStyle: row.extraStyle || '', hasBorder })
  }).join('')

  const body = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .container { padding: 25px 15px !important; border-radius: 6px !important; }
        .label-col { width: 35% !important; font-size: 13px !important; }
        .value-col { width: 65% !important; padding-left: 10px !important; font-size: 13px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:20px 10px;font-family:${styles.fonts.body};background-color:${styles.colors.bg};-webkit-font-smoothing:antialiased;">
    <div class="container" style="max-width:560px;margin:0 auto;background-color:${styles.colors.white};padding:40px 30px;border-radius:8px;border:1px solid ${styles.colors.containerBorder};box-shadow:0 4px 12px rgba(0,0,0,0.02);box-sizing:border-box;">
      <h1 style="text-align:left;color:${styles.colors.dark};margin-top:0;margin-bottom:25px;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${escapeHtml(t.heading)}</h1>
      <p style="font-size:15px;color:${styles.colors.dark};margin-top:0;margin-bottom:8px;font-weight:700;">${escapeHtml(t.greeting.replace('%s', firstName))}</p>
      <p style="font-size:14px;color:${styles.colors.midGray};margin-top:0;margin-bottom:8px;line-height:1.5;">${escapeHtml(t.intro)}</p>
      <p style="font-size:14px;color:${styles.colors.midGray};margin-top:0;margin-bottom:30px;line-height:1.5;">${escapeHtml(t.intro2)}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:30px;width:100%;table-layout:auto;">
        ${rowsHtml}
      </table>
      ${thanksHtml}
      ${termsHtml}
      ${companyInfoHtml}
    </div>
  </body>
</html>`

  return {
    subject: t.subject,
    body,
    locale,
  }
}

export { makeTerms, resolveEmailLanguage, buildConfirmationEmail, formatDate }
