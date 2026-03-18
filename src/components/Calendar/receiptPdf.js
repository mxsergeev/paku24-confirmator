import { jsPDF } from 'jspdf'

import receiptLogo from '../../assets/laskuLogo.png'

const A4_WIDTH = 210
const A4_HEIGHT = 297
const PAGE_MARGIN = 6.9
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN * 2
const CONTENT_HEIGHT = A4_HEIGHT - PAGE_MARGIN * 2
const ALV_RATE = 25.5

function num(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function roundMoney(value) {
  return Math.round(num(value) * 100) / 100
}

function formatMoney(value) {
  return roundMoney(value).toFixed(2).replace('.', ',')
}

function asText(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function base64FromArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return window.btoa(binary)
}

async function getLogoDataUrl() {
  try {
    const response = await fetch(receiptLogo)
    const blob = await response.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    return null
  }
}

function drawText(doc, value, x, y, options = {}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return
    doc.text(value, x, y, options)
    return
  }

  const text = asText(value)
  if (!text) return

  doc.text(text, x, y, options)
}

function fitTextToWidth(doc, value, maxWidth) {
  const text = asText(value)
  if (!text) return ''

  const lines = doc.splitTextToSize(text, maxWidth)
  return lines.join('\n')
}

function drawTableCell(
  doc,
  {
    x,
    y,
    w,
    h,
    value,
    align = 'left',
    valign = 'middle',
    paddingX = 1.8,
    paddingY = 1.2,
    lineHeight = 4,
    border = true,
    fontStyle = 'normal',
    maxLines = null,
  }
) {
  if (border) {
    doc.rect(x, y, w, h)
  }

  doc.setFont('arial', fontStyle)
  const maxTextWidth = Math.max(2, w - paddingX * 2)
  let lines = doc.splitTextToSize(asText(value), maxTextWidth)

  if (maxLines === 1) {
    lines = [fitTextToWidth(doc, lines.join(' '), maxTextWidth)]
  } else if (maxLines && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    const lastLineIndex = kept.length - 1
    kept[lastLineIndex] = fitTextToWidth(doc, kept[lastLineIndex], maxTextWidth)
    lines = kept
  }

  const textHeight = Math.max(lineHeight, lines.length * lineHeight)

  let textY = y + paddingY + lineHeight - 0.8
  if (valign === 'middle') {
    textY = y + (h - textHeight) / 2 + lineHeight - 0.8
  } else if (valign === 'top') {
    textY = y + paddingY + lineHeight - 0.8
  }

  let textX = x + paddingX
  if (align === 'center') {
    textX = x + w / 2
  } else if (align === 'right') {
    textX = x + w - paddingX
  }

  doc.text(lines, textX, textY, { align })
}

function drawReceiptHeader(doc, receipt, isInvoice, logoDataUrl) {
  const x = PAGE_MARGIN
  const y = PAGE_MARGIN
  const total = 1.2 + 0.6 + 1
  const leftW = (CONTENT_WIDTH * 1.2) / total
  const centerW = (CONTENT_WIDTH * 0.6) / total
  const rightW = CONTENT_WIDTH - leftW - centerW

  const blockTopOffset = 8
  const logoX = x + 1
  const logoY = y + 1

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, 56, 18)
  }

  doc.setFont('arial', 'normal')
  doc.setFontSize(10.5)
  drawText(doc, 'Y-tunnus 2485335-8', x, y + 26)
  drawText(doc, 'Puh. 0451797930', x, y + 30.6)
  drawText(doc, 'Luutnantinpolku 2 A 17', x, y + 35.2)
  drawText(doc, '00420 Helsinki', x, y + 39.8)

  doc.setFont('arial', 'bold')
  doc.setFontSize(16)
  const titleBaselineY = y + blockTopOffset + 6
  drawText(doc, isInvoice ? 'LASKU' : 'KUITTI', x + leftW + 3, titleBaselineY)

  const metaX = x + leftW + centerW
  const labelX = metaX
  const valueX = metaX + rightW
  let rowY = titleBaselineY - 1.5

  doc.setFont('arial', 'normal')
  doc.setFontSize(10.2)

  const metaRows = [
    ['Sivu', '1/1'],
    ['Laskunro', receipt.invoiceNumber],
    ['Ajalta', receipt.serviceDate],
    ['Päiväys', receipt.invoiceDate],
  ]

  if (isInvoice) {
    metaRows.push(
      ['Eräpäivä', receipt.dueDate],
      ['Toimitapa', 'Posti'],
      ['Huomatusaika', '8 pv'],
      ['Maksuehto', '14 pv'],
      ['Viivätyskorko', '8%'],
      ['Laskulisä', '5 €']
    )
  }

  metaRows.forEach(([label, value]) => {
    if (label === 'Laskulisä') {
      drawText(doc, label, labelX + 0.2, rowY)
      drawText(doc, asText(value), valueX - 0.6, rowY, { align: 'right' })
    } else {
      drawText(doc, label, labelX, rowY)
      drawText(doc, asText(value), valueX, rowY, { align: 'right' })
    }

    rowY += 4.6
  })

  return y + 91
}

function drawReceiptInfoTable(doc, receiptRows, totals, receipt, isInvoice, startY) {
  const x = PAGE_MARGIN
  const targetHeight = CONTENT_HEIGHT - (startY - PAGE_MARGIN)

  const colRatios = [41, 11.8, 11.8, 11.8, 11.8, 11.8]
  const totalRatio = colRatios.reduce((sum, item) => sum + item, 0)
  const widths = colRatios.map((ratio) => (CONTENT_WIDTH * ratio) / totalRatio)

  const colX = [x]
  widths.forEach((w, idx) => {
    colX[idx + 1] = colX[idx] + w
  })

  let y = startY

  const headerHeight = 8.8
  const serviceBaseHeight = 6.3
  const summaryRowHeight = 6.3
  const companyRowHeight = 19
  const bankHeight = 57

  const serviceRowsHeight = serviceBaseHeight * receiptRows.length
  const fixedHeight =
    headerHeight + serviceRowsHeight + summaryRowHeight * 3 + companyRowHeight + bankHeight

  const lastRowExtra = Math.max(0, targetHeight - fixedHeight)

  doc.setFont('arial', 'bold')
  doc.setFontSize(10)
  const headers = [
    'Tuotenimi',
    'Kpl',
    'a hinta',
    'Hinta',
    `ALV ${String(ALV_RATE).replace('.', ',')}%`,
    `€ yht. (alv ${String(ALV_RATE).replace('.', ',')}%)`,
  ]

  const serviceRowsTotalHeight = serviceRowsHeight + lastRowExtra

  // Header in HTML has no inner vertical separators, only outer left/right edges.
  doc.line(colX[0], y, colX[6], y)
  doc.line(colX[0], y + headerHeight, colX[6], y + headerHeight)
  doc.line(colX[0], y, colX[0], y + headerHeight + serviceRowsTotalHeight)
  doc.line(colX[6], y, colX[6], y + headerHeight + serviceRowsTotalHeight)

  headers.forEach((header, idx) => {
    drawTableCell(doc, {
      x: colX[idx],
      y,
      w: widths[idx],
      h: headerHeight,
      value: header,
      align: idx === 0 ? 'left' : 'center',
      border: false,
      fontStyle: 'bold',
      lineHeight: 3.8,
      maxLines: 2,
    })
  })

  y += headerHeight
  doc.setFontSize(10.1)

  receiptRows.forEach((row, index) => {
    const isLastRow = index === receiptRows.length - 1
    const rowHeight = serviceBaseHeight + (isLastRow ? lastRowExtra : 0)

    drawTableCell(doc, {
      x: colX[0],
      y: y + 2,
      w: widths[0],
      h: rowHeight,
      value: row.name,
      border: false,
      valign: isLastRow ? 'top' : 'middle',
      maxLines: 1,
    })
    drawTableCell(doc, {
      x: colX[1],
      y: y + 2,
      w: widths[1],
      h: rowHeight,
      value: asText(row.hours),
      border: false,
      valign: isLastRow ? 'top' : 'middle',
      align: 'center',
      maxLines: 1,
    })
    drawTableCell(doc, {
      x: colX[2],
      y: y + 2,
      w: widths[2],
      h: rowHeight,
      value: row.unitPrice === '' ? '' : formatMoney(row.unitPrice),
      border: false,
      valign: isLastRow ? 'top' : 'middle',
      align: 'center',
      maxLines: 1,
    })
    drawTableCell(doc, {
      x: colX[3],
      y: y + 2,
      w: widths[3],
      h: rowHeight,
      value: formatMoney(row.netto),
      border: false,
      valign: isLastRow ? 'top' : 'middle',
      align: 'center',
      maxLines: 1,
    })
    drawTableCell(doc, {
      x: colX[4],
      y: y + 2,
      w: widths[4],
      h: rowHeight,
      value: formatMoney(row.alv),
      border: false,
      valign: isLastRow ? 'top' : 'middle',
      align: 'center',
      maxLines: 1,
    })
    drawTableCell(doc, {
      x: colX[5],
      y: y + 2,
      w: widths[5],
      h: rowHeight,
      value: formatMoney(row.brutto),
      border: false,
      valign: isLastRow ? 'top' : 'middle',
      align: 'center',
      maxLines: 1,
    })

    y += rowHeight
  })

  const summaryRows = [
    ['Veron peruste 25,5%', formatMoney(totals.netto)],
    ['ALV 25,5%', formatMoney(totals.alv)],
    ['YHT €', formatMoney(totals.brutto)],
  ]

  const summaryBlockStartY = y
  const summaryBlockEndY = y + summaryRowHeight * summaryRows.length + companyRowHeight

  doc.line(colX[0], summaryBlockStartY, colX[0], summaryBlockEndY)
  doc.line(colX[3], summaryBlockStartY, colX[3], summaryBlockEndY)
  doc.line(colX[6], summaryBlockStartY, colX[6], summaryBlockEndY)
  doc.line(colX[0], summaryBlockStartY, colX[6], summaryBlockStartY)

  summaryRows.forEach(([label, value]) => {
    if (label === 'YHT €') {
      doc.line(colX[0], y + summaryRowHeight, colX[6], y + summaryRowHeight)
    } else {
      doc.line(colX[3], y + summaryRowHeight, colX[6], y + summaryRowHeight)
    }

    doc.setFont('arial', 'normal')
    doc.setFontSize(10.2)

    drawText(
      doc,
      fitTextToWidth(doc, label, widths[3] + widths[4] + widths[5] - 8),
      colX[3] + 2,
      y + 4.3
    )
    drawText(
      doc,
      fitTextToWidth(doc, value, widths[3] + widths[4] + widths[5] - 8),
      colX[6] - 2,
      y + 4.3,
      { align: 'right' }
    )
    y += summaryRowHeight
  })

  doc.line(colX[0], y + companyRowHeight, colX[6], y + companyRowHeight)

  const companyX = colX[0] + 2
  const companyTop = y + 4.4
  const labelWidth = 27
  const companyRows = [
    ['Pankkiyhteys:', 'FI85 3939 0065 1979 23'],
    ['Yhteyshenkilö:', 'Paku24'],
    ['E-mail:', 'asiakaspalvelu@paku24.fi'],
  ]

  doc.setFontSize(10)
  companyRows.forEach(([label, value], idx) => {
    const rowY = companyTop + idx * 5.9
    drawText(doc, label, companyX, rowY)
    drawText(doc, value, companyX + labelWidth, rowY)
  })

  y += companyRowHeight

  drawBankBlock(doc, {
    x: colX[0],
    y,
    w: CONTENT_WIDTH,
    h: bankHeight,
    receipt,
    totals,
    isInvoice,
  })
}

function drawBankBlock(doc, { x, y, w, h, receipt, totals, isInvoice }) {
  doc.rect(x, y, w, h)

  const leftHalf = w / 2
  const c1 = (leftHalf * 7) / 26
  const c2 = leftHalf - c1
  const rightPart = w - leftHalf
  const c3 = rightPart / 3
  const c4 = rightPart / 3
  const c5 = rightPart - c3 - c4

  const x1 = x
  const x2 = x1 + c1
  const x3 = x2 + c2
  const x4 = x3 + c3
  const x5 = x4 + c4
  const x6 = x + w

  const r1 = 13
  const r2 = 10
  const r3 = 12
  const r4 = 10
  const r5 = h - r1 - r2 - r3 - r4

  const y1 = y
  const y2 = y1 + 2 + r1
  const y3 = y2 + r2
  const y4 = y3 + r3
  const y5 = y4 + r4
  const y6 = y + h

  // vertical lines
  doc.line(x2, y1, x2, y6)
  doc.line(x3, y1, x3, y6)
  doc.line(x4 - 4, y4, x4 - 4, y6)
  doc.line(x5 - 1.5, y5, x5 - 1.5, y6)

  // horisonal lines
  doc.line(x1, y2, x3, y2)
  doc.line(x1, y3, x3, y3)
  doc.line(x1, y4, x2, y4)
  doc.line(x3, y4, x6, y4)
  doc.line(x1, y5, x6, y5)

  doc.setFont('arial', 'normal')
  doc.setFontSize(10)

  drawText(doc, fitTextToWidth(doc, 'Saajan tilinro', c1 - 3), x1 + 1.5, y1 + 4.5)
  drawText(
    doc,
    doc.splitTextToSize(fitTextToWidth(doc, 'Mottagarens kontonummer', c1 - 3), c1 - 3),
    x1 + 1.5,
    y1 + 8.2
  )
  drawText(doc, fitTextToWidth(doc, 'FI85 3939 0065 1979 23', c2 - 3.6), x2 + 1.8 + 1, y1 + 8.4)

  drawText(doc, fitTextToWidth(doc, 'Saaja', c1 - 3), x1 + 1.5, y2 + 4.5)
  drawText(doc, fitTextToWidth(doc, 'Mottagare', c1 - 3), x1 + 1.5, y2 + 8.1)
  drawText(doc, fitTextToWidth(doc, 'Paku24 tmi', c2 - 3.6), x2 + 1.8 + 1, y2 + 6.1)

  drawText(doc, fitTextToWidth(doc, 'Maksaja', c1 - 3), x1 + 1.5, y3 + 5.2)
  drawText(doc, fitTextToWidth(doc, 'Betalare', c1 - 3), x1 + 1.5, y3 + 8.9)
  drawText(doc, fitTextToWidth(doc, asText(receipt.customerName), c2 - 3.6), x2 + 1.8 + 1, y3 + 5.2)
  drawText(
    doc,
    fitTextToWidth(doc, asText(receipt.customerAddress), c2 - 3.6),
    x2 + 1.8 + 1,
    y3 + 8.7
  )

  drawText(doc, fitTextToWidth(doc, 'Allekirjoitus', c1 - 3), x1 + 1.5, y4 + 4.2)
  drawText(doc, fitTextToWidth(doc, 'Underskrift', c1 - 3), x1 + 1.5, y4 + 7.9)
  drawText(doc, fitTextToWidth(doc, 'Viesti', c3 - 3.6), x3 + 1.8, y4 + 6.2)
  drawText(
    doc,
    fitTextToWidth(doc, asText(receipt.customerName), c4 + c5 - 4),
    (x4 + x6 - 8) / 2,
    y4 + 6.2,
    { align: 'center' }
  )

  drawText(doc, fitTextToWidth(doc, 'Tililtä', c1 - 3), x1 + 1.5, y5 + 4.2)
  drawText(doc, fitTextToWidth(doc, 'Från konto', c1 - 3), x1 + 1.5, y5 + 7.9)
  drawText(doc, fitTextToWidth(doc, 'Eräpäivä', c3 - 3.6), x3 + 1.8, y5 + 4.2)
  drawText(doc, fitTextToWidth(doc, 'Förf.dag', c3 - 3.6), x3 + 1.8, y5 + 7.9)

  if (isInvoice) {
    drawText(
      doc,
      fitTextToWidth(doc, asText(receipt.dueDate), c4 - 3.6),
      (x4 + x5 - 6) / 2,
      y5 + 6.2,
      {
        align: 'center',
      }
    )
  }

  drawText(doc, '€', x5 + 1.8 - 1, y5 + 6.2)
  drawText(doc, fitTextToWidth(doc, formatMoney(totals.brutto), c5 - 3.6), x6 - 1.8, y5 + 6.2, {
    align: 'right',
  })

  if (isInvoice) {
    doc.setFontSize(9.3)
    doc.setFont('arial', 'bold')
    drawText(doc, 'Tilisiirto Girering', x3 + 1.8, y1 + 4.3)
    doc.setFont('arial', 'normal')

    const info1 =
      'Maksu välitetään saajalle vain Suomessa kotimaan kontonummer maksujenvälityksen yleisten ehtojen mukaisesti ja vain maksajan ilmoittaman tilinron perusteella.'
    const info2 =
      'Saaja Paku24 tmi Betalning förmedlas endast till mottagare i Finland Mottagare enligt Allmänna villkor för inrikes betalningförmedling och endas till det kontonummer betalaren angivit.'

    const maxWidth = x6 - x3 - 3.5
    const lines1 = doc.splitTextToSize(info1, maxWidth)
    const lines2 = doc.splitTextToSize(info2, maxWidth)

    const boxBottom = y4 - 1.5
    const maxLines1 = Math.max(1, Math.floor((boxBottom - (y1 + 8.4)) / 3.6))
    const firstPart = lines1.slice(0, maxLines1)
    const remainingLines = Math.max(0, Math.floor((boxBottom - (y1 + 18.2)) / 3.6))
    const secondPart = lines2.slice(0, remainingLines)

    drawText(doc, firstPart, x3 + 1.8, y1 + 9.4)
    drawText(doc, secondPart, x3 + 1.8, y1 + 21.5)
  }
}

async function buildReceiptPdf(receipt, receiptRows = [], totals = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  doc.setProperties({
    title: `Receipt ${receipt?.invoiceNumber || ''}`.trim(),
    subject: 'Receipt / Invoice',
    author: 'Paku24',
  })

  doc.setTextColor(17, 17, 17)
  doc.setDrawColor(17, 17, 17)
  doc.setLineWidth(0.2)
  doc.setFont('arial', 'normal')

  const logoDataUrl = await getLogoDataUrl()
  const isInvoice = String(receipt?.paymentTypeId || receipt?.paymentType || '') === '3'

  const tableStartY = drawReceiptHeader(doc, receipt || {}, isInvoice, logoDataUrl)
  drawReceiptInfoTable(doc, receiptRows, totals, receipt || {}, isInvoice, tableStartY)

  return doc
}

export async function downloadReceiptPdf(receipt, fileName, receiptRows = [], totals = {}) {
  const doc = await buildReceiptPdf(receipt, receiptRows, totals)
  doc.save(fileName || 'receipt.pdf')
}

export async function makeReceiptPdfBase64(receipt, receiptRows = [], totals = {}) {
  const doc = await buildReceiptPdf(receipt, receiptRows, totals)
  const buffer = doc.output('arraybuffer')
  return base64FromArrayBuffer(buffer)
}
