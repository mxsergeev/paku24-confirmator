import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, CircularProgress } from '@material-ui/core'
import { enqueueSnackbar } from 'notistack'
import dayjs from 'dayjs'
import orderPoolAPI from '../../services/orderPoolAPI'
import { sendReceiptEmail } from '../../services/emailAPI'
import feesConfig from '../../data/fees.json'
import receiptLogo from '../../assets/laskuLogo.png'
import { buildReceiptDraftFromOrder } from './ReceiptEditDialog'
import { buildStableInvoiceNumber, formatDateForReceipt } from './receiptData.helpers'
import { downloadReceiptPdf, makeReceiptPdfBase64 } from './receiptPdf'
import './Calendar.css'

const ALV_FACTOR = 1.255
const STAIRS_FEE_BASE_NAME = 'stairsFee'

const DEFAULT_FEE_LABELS = feesConfig.reduce((acc, fee) => {
  if (!fee?.name) return acc
  acc[fee.name] = fee.label || fee.name
  return acc
}, {})

const STAIRS_START_FLOOR = Number(
  feesConfig.find((fee) => fee?.name === STAIRS_FEE_BASE_NAME)?.startFloor
)
const STAIRS_UNIT_BRUTTO = Number(
  feesConfig.find((fee) => fee?.name === STAIRS_FEE_BASE_NAME)?.baseFee
)

// Edit this object to quickly rename any fee label in receipts.
const FEE_LABEL_OVERRIDES = {
  paymentTypeFee: 'Laskutuslisä',
}

function num(value) {
  const parsed = Number(String(value || ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function roundMoney(value) {
  return Math.round(num(value) * 100) / 100
}

function formatMoney(value) {
  return roundMoney(value).toFixed(2).replace('.', ',')
}

function toAlvParts(bruttoAmount) {
  const brutto = roundMoney(bruttoAmount)
  const netto = roundMoney(brutto / ALV_FACTOR)
  const alv = roundMoney(brutto - netto)
  return { netto, alv, brutto }
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

  const addresses = [order?.address, order?.destination, ...(order?.extraAddresses || [])]
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
    return roundMoney(feeBrutto / STAIRS_UNIT_BRUTTO)
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
    const street = String(address?.street || '').trim()
    const baseLabel = toLabelCase(DEFAULT_FEE_LABELS[baseName] || 'Lisämaksu')
    return street ? `${baseLabel} (${street})` : baseLabel
  }

  const resolvedLabel =
    DEFAULT_FEE_LABELS[feeName] || DEFAULT_FEE_LABELS[baseName] || feeName || 'Lisämaksu'

  return toLabelCase(resolvedLabel)
}

function mergeReceiptData(order, draft = null) {
  const base = buildReceiptDraftFromOrder(order)
  const defaultServiceDate = dayjs(order?.date).format('DD.MM.YYYY')
  const defaultInvoiceDate = dayjs().format('DD.MM.YYYY')
  const defaultDueDate = dayjs().add(14, 'day').format('DD.MM.YYYY')

  const draftData = draft || {}

  return {
    ...base,
    ...draftData,
    invoiceNumber: buildStableInvoiceNumber(order, draftData.invoiceNumber),
    serviceDate: formatDateForReceipt(draftData.serviceDate, defaultServiceDate),
    invoiceDate: formatDateForReceipt(draftData.invoiceDate, defaultInvoiceDate),
    dueDate: formatDateForReceipt(draftData.dueDate, defaultDueDate),
  }
}

export default function ReceiptPage({ orderId, initialDraft = null }) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [order, setOrder] = useState(null)
  const [lastServiceExtraPadding, setLastServiceExtraPadding] = useState(0)

  const receiptInfoRef = React.useRef(null)
  const bankWrapperRef = React.useRef(null)
  const bankTableRef = React.useRef(null)

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response = await orderPoolAPI.getOrderById(orderId)
      const loadedOrder = response?.order || null
      setOrder(loadedOrder)
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar('Failed to load order for receipt page.', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const receipt = useMemo(() => {
    if (!order) return null

    const mergedReceipt = mergeReceiptData(order, initialDraft)

    const unitBruttoPrice = num(order?.service?.pricePerHour || mergedReceipt.unitPrice)
    const unitAlvPrice = roundMoney(unitBruttoPrice - unitBruttoPrice / ALV_FACTOR)

    return {
      ...mergedReceipt,
      paymentTypeId: order?.paymentType?.id,
      alvRate: formatMoney(unitAlvPrice),
      serviceName: mergedReceipt.serviceName || order?.service?.name || '',
      serviceHours: mergedReceipt.serviceHours || order?.duration || '-',
      unitPrice: formatMoney(unitBruttoPrice),
    }
  }, [initialDraft, order])

  const isInvoice = order?.paymentType?.id === '3'

  const receiptRows = useMemo(() => {
    if (!receipt || !order) return []

    const rows = []

    const serviceHours = num(receipt.serviceHours)
    const serviceUnitBruttoPrice = num(order?.service?.pricePerHour || receipt.unitPrice)
    const serviceUnitNettoPrice = roundMoney(serviceUnitBruttoPrice / ALV_FACTOR)
    const serviceBrutto = roundMoney(serviceHours * serviceUnitBruttoPrice)
    const serviceNetto = roundMoney(serviceUnitNettoPrice * serviceHours)
    const serviceAlv = roundMoney(serviceBrutto - serviceNetto)

    if (serviceBrutto > 0) {
      rows.push({
        key: 'service',
        name: receipt.serviceName || order?.service?.name || 'Palvelu',
        hours: receipt.serviceHours,
        unitPrice: serviceUnitNettoPrice,
        netto: serviceNetto,
        alv: serviceAlv,
        brutto: serviceBrutto,
      })
    }

    const boxesAmount = num(order?.boxes?.amount)
    const boxesFromFields =
      boxesAmount * num(order?.boxes?.pricePerBox) +
      num(order?.boxes?.deliveryPrice) +
      num(order?.boxes?.returnPrice)
    const boxesBrutto = roundMoney(num(order?.boxesPrice) || boxesFromFields)

    if (boxesBrutto > 0) {
      const boxesUnitBruttoPrice = boxesAmount > 0 ? roundMoney(boxesBrutto / boxesAmount) : 0
      const boxesUnitNettoPrice =
        boxesAmount > 0 ? roundMoney(boxesUnitBruttoPrice / ALV_FACTOR) : ''
      const boxesNetto =
        boxesAmount > 0
          ? roundMoney(num(boxesUnitNettoPrice) * boxesAmount)
          : toAlvParts(boxesBrutto).netto
      const boxesAlv = roundMoney(boxesBrutto - boxesNetto)

      rows.push({
        key: 'boxes',
        name: 'Laatikot',
        hours: boxesAmount > 0 ? boxesAmount : '',
        unitPrice: boxesUnitNettoPrice,
        netto: boxesNetto,
        alv: boxesAlv,
        brutto: boxesBrutto,
      })
    }

    ;(order?.fees || []).forEach((fee, index) => {
      const feeBrutto = roundMoney(fee?.amount)
      if (feeBrutto <= 0) return

      const { netto, alv, brutto } = toAlvParts(feeBrutto)
      const feeName = String(fee?.name || '')
      const baseFeeName = getFeeBaseName(feeName)
      const isStairsFee = baseFeeName === STAIRS_FEE_BASE_NAME

      let feeHours = ''
      let feeUnitPrice = ''

      if (isStairsFee) {
        const floorsCount = getStairsPaidFloorCount(order, feeName, feeBrutto)
        if (floorsCount > 0) {
          const unitBrutto =
            Number.isFinite(STAIRS_UNIT_BRUTTO) && STAIRS_UNIT_BRUTTO > 0
              ? STAIRS_UNIT_BRUTTO
              : roundMoney(feeBrutto / floorsCount)
          feeHours = floorsCount
          feeUnitPrice = roundMoney(unitBrutto / ALV_FACTOR)
        }
      }

      rows.push({
        key: `fee-${index}`,
        name: resolveFeeDisplayName(order, fee),
        hours: feeHours,
        unitPrice: feeUnitPrice,
        netto,
        alv,
        brutto,
      })
    })

    return rows
  }, [order, receipt])

  const totals = useMemo(() => {
    const netto = roundMoney(receiptRows.reduce((sum, row) => sum + num(row.netto), 0))
    const alv = roundMoney(receiptRows.reduce((sum, row) => sum + num(row.alv), 0))
    const calculatedBrutto = roundMoney(receiptRows.reduce((sum, row) => sum + num(row.brutto), 0))

    const draftBrutto = roundMoney(receipt?.totalAmount)
    const brutto = draftBrutto > 0 ? draftBrutto : calculatedBrutto

    return {
      netto,
      alv,
      brutto,
    }
  }, [receipt?.totalAmount, receiptRows])

  const recalcLastServicePadding = useCallback(() => {
    const receiptInfoEl = receiptInfoRef.current
    const bankWrapperEl = bankWrapperRef.current
    const bankTableEl = bankTableRef.current

    if (!receiptInfoEl || !bankWrapperEl || !bankTableEl || receiptRows.length === 0) {
      setLastServiceExtraPadding(0)
      return
    }

    const wrapperRect = bankWrapperEl.getBoundingClientRect()
    const bankRect = bankTableEl.getBoundingClientRect()
    const deltaBetweenWrapperAndBankTable = Math.round(wrapperRect.height - bankRect.height)

    // Keep bank wrapper tightly fitted and push all extra space into the last service row.
    const tableRect = receiptInfoEl.getBoundingClientRect()
    const tableStyles = window.getComputedStyle(receiptInfoEl)
    const targetHeight =
      Number.parseFloat(tableStyles.getPropertyValue('--receipt-info-target-height')) || 740

    const missingToTarget = Math.round(targetHeight - tableRect.height + lastServiceExtraPadding)
    const nextPadding = Math.max(0, deltaBetweenWrapperAndBankTable + missingToTarget)

    setLastServiceExtraPadding((prev) => (prev === nextPadding ? prev : nextPadding))
  }, [lastServiceExtraPadding, receiptRows.length])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      recalcLastServicePadding()
    })

    const handleResize = () => recalcLastServicePadding()
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
    }
  }, [recalcLastServicePadding, lastServiceExtraPadding])

  const handleDownload = useCallback(async () => {
    if (!receipt) return
    const fileName = `receipt-${receipt.invoiceNumber || 'document'}.pdf`
    try {
      await downloadReceiptPdf(receipt, fileName, receiptRows, totals)
    } catch (err) {
      enqueueSnackbar('Failed to create receipt PDF.', { variant: 'error' })
    }
  }, [receipt, receiptRows, totals])

  const handleSend = useCallback(async () => {
    if (!receipt?.customerEmail) {
      enqueueSnackbar('Email is missing in receipt data.', { variant: 'warning' })
      return
    }

    try {
      setSending(true)
      const pdfBase64 = await makeReceiptPdfBase64(receipt, receiptRows, totals)
      const fileName = `receipt-${receipt.invoiceNumber || 'document'}.pdf`

      const response = await sendReceiptEmail({
        email: receipt.customerEmail,
        pdfBase64,
        fileName,
        subject: `Receipt ${receipt.invoiceNumber || ''}`.trim(),
        body: 'Please find your receipt attached.',
      })

      enqueueSnackbar(response.message || 'Receipt email sent.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Failed to send receipt email.', {
        variant: 'error',
      })
    } finally {
      setSending(false)
    }
  }, [receipt, receiptRows, totals])

  if (loading) {
    return (
      <div className="receipt-page-loading">
        <CircularProgress size={30} />
      </div>
    )
  }

  if (!receipt) {
    return <div className="receipt-page-loading">Receipt data is missing.</div>
  }

  return (
    <section className="receipt-page-wrap">
      <div className="receipt-page-toolbar">
        <Button variant="contained" color="primary" onClick={handleDownload}>
          Download
        </Button>
        <Button variant="contained" color="primary" onClick={handleSend} disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>

      <article className="receipt-document">
        <header className="receipt-document-head">
          <div>
            <img
              className="receipt-logo"
              src={receiptLogo}
              alt="Logo"
              width="250px"
            />
            <p>Y-tunnus 2485335-8</p>
            <p>Puh. 0451797930</p>
            <p>Luutnantinpolku 2 A 17</p>
            <p>00420 Helsinki</p>
          </div>
          <div className="receipt-title-block">
            {isInvoice && <h3 className="receipt-title">LASKU</h3>}
            {!isInvoice && <h3 className="receipt-title">KUITTI</h3>}
          </div>
          <div className="receipt-meta-grid">
            <span>Sivu</span>
            <span className="left">1/1</span>
            <span>Laskunro</span>
            <span className="left">{receipt.invoiceNumber}</span>
            <span>Ajalta</span>
            <span className="left">{receipt.serviceDate}</span>
            <span>Päiväys</span>
            <span className="left">{receipt.invoiceDate}</span>

            {isInvoice && (
              <>
                <span>Eräpäivä</span>
                <span className="left">{receipt.dueDate}</span>
                <span>Toimitapa</span>
                <span className="left">Posti</span>
                <span>Huomatusaika</span>
                <span className="left">8 pv</span>
                <span>Maksuehto</span>
                <span className="left">14 pv</span>
                <span>Viivätyskorko</span>
                <span className="left">8 %</span>
                <span>Laskulisä</span>
                <span className="left">5 €</span>
              </>
            )}
          </div>
        </header>

        <table className="receipt-info" ref={receiptInfoRef}>
          <thead>
            <tr className="receipt-info-header-string">
              <th className="service-name">Tuotenimi</th>
              <th className="service-hours">Kpl</th>
              <th className="unit-price">a hinta</th>
              <th className="hours-summa">Hinta</th>
              <th className="value-alv">ALV 25,5%</th>
              <th className="value-total">€ yht. (alv 25,5%)</th>
            </tr>
          </thead>

          <tbody className="receipt-info-body">
            {receiptRows.map((row, index) => (
              <tr
                className={`receipt-info-service ${
                  index === 0 ? 'receipt-info-service--first' : ''
                } ${index === receiptRows.length - 1 ? 'receipt-info-service--last' : ''}`}
                style={
                  index === receiptRows.length - 1
                    ? { '--receipt-last-service-extra-padding': `${lastServiceExtraPadding}px` }
                    : undefined
                }
                key={row.key}
              >
                <td className="service-name">{row.name}</td>
                <td className="service-hours">{row.hours}</td>
                <td className="unit-price">
                  {row.unitPrice === '' ? '' : formatMoney(row.unitPrice)}
                </td>
                <td className="hours-summa">{formatMoney(row.netto)}</td>
                <td className="value-alv">{formatMoney(row.alv)}</td>
                <td className="value-total">{formatMoney(row.brutto)}</td>
              </tr>
            ))}

            <tr>
              <td colSpan="3" rowSpan="3"></td>
              <td colSpan="3">
                <div className="receipt-summary-row">
                  <div>Veron peruste 25,5%</div>
                  <div>{formatMoney(totals.netto)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan="3">
                <div className="receipt-summary-row">
                  <div>ALV 25,5%</div>
                  <div>{formatMoney(totals.alv)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan="3">
                <div className="receipt-summary-row">
                  <div>YHT €</div>
                  <div>{formatMoney(totals.brutto)}</div>
                </div>
              </td>
            </tr>

            <tr className="receipt-company-info">
              <td colSpan="3">
                <div>
                  <div className="receipt-company-unit">
                    <span>Pankkiyhteys:</span>
                    <span>FI85 3939 0065 1979 23</span>
                  </div>
                  <div className="receipt-company-unit">
                    <span>Yhteyshenkilö:</span>
                    <span>Paku24</span>
                  </div>
                  <div className="receipt-company-unit">
                    <span>E-mail:</span>
                    <span>asiakaspalvelu@paku24.fi</span>
                  </div>
                </div>
              </td>
              <td colSpan="3"></td>
            </tr>

            <tr className="receipt-bank-row">
              <td colSpan="6" className="receipt-bank-wrapper" ref={bankWrapperRef}>
                <table className="receipt-bank-table" ref={bankTableRef}>
                  <colgroup>
                    <col className="receipt-bank-col-1" />
                    <col className="receipt-bank-col-2" />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td className="receipt-bank-cell receipt-bank-cell--no-top receipt-bank-cell--no-left">
                        <div>Saajan tilinro</div>
                        <div>Mottagarens kontonummer</div>
                      </td>
                      <td className="receipt-bank-cell receipt-bank-cell--no-top">
                        <div>FI85 3939 0065 1979 23</div>
                      </td>
                      <td
                        rowSpan="3"
                        colSpan="3"
                        className="receipt-bank-cell receipt-bank-cell--no-top receipt-bank-cell--no-right"
                      >
                        {isInvoice && (
                          <>
                            <div className="receipt-bank-info">
                              <div className="bold">Tilisiirto Girering</div>
                              <div>
                                Maksu välitetään saajalle vain Suomessa kotimaan kontonummer
                                maksujenvälityksen yleisten ehtojen mukaisesti ja vain maksajan
                                ilmoittaman tilinron perusteella.
                              </div>
                              <div>
                                Saaja Paku24 tmi Betalning förmedlas endast till mottagare i Finland
                                Mottagare enligt Allmänna villkor för inrikes betalningförmedling
                                och endas till det kontonummer betalaren angivit.
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="receipt-bank-cell receipt-bank-cell--no-left">
                        <div>Saaja</div>
                        <div>Mottagare</div>
                      </td>
                      <td className="receipt-bank-cell">
                        <div>Paku24 tmi</div>
                      </td>
                    </tr>

                    <tr>
                      <td className="receipt-bank-cell receipt-bank-cell--no-left">
                        <div>Maksaja</div>
                        <div>Betalare</div>
                      </td>
                      <td rowSpan="2" className="receipt-bank-cell-2">
                        <div>{receipt.customerName}</div>
                        <div>{receipt.customerAddress}</div>
                      </td>
                    </tr>

                    <tr>
                      <td className="receipt-bank-cell receipt-bank-cell--no-left">
                        <div>Allekirjoitus</div>
                        <div>Underskrift</div>
                      </td>
                      <td className="receipt-bank-cell">
                        <div>Viesti</div>
                      </td>
                      <td colSpan="2" className="receipt-bank-cell receipt-bank-cell--no-right">
                        <div className="receipt-customer-name">{receipt.customerName}</div>
                      </td>
                    </tr>

                    <tr>
                      <td className="receipt-bank-cell receipt-bank-cell--no-left receipt-bank-cell--no-bottom">
                        <div>Tililtä</div>
                        <div>Från konto</div>
                      </td>
                      <td className="receipt-bank-cell receipt-bank-cell--no-bottom"></td>
                      <td className="receipt-bank-cell receipt-bank-cell--no-bottom">
                        <div>Eräpäivä</div>
                        <div>Förf.dag</div>
                      </td>
                      <td className="receipt-bank-cell receipt-bank-cell--no-bottom">
                        {isInvoice && (
                          <div className="receipt-customer-name">{receipt.dueDate}</div>
                        )}
                      </td>
                      <td className="receipt-bank-cell receipt-bank-cell--no-right receipt-bank-cell--no-bottom">
                        <div className="receipt-summary">
                          <div>€</div>
                          <div>{formatMoney(totals.brutto)}</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </section>
  )
}
