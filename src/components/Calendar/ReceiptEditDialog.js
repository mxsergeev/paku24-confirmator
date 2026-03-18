import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  TextField,
} from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import {
  sanitizeDecimalString,
  parseAndFormatDecimalString,
} from '../../helpers/decimalStringHelpers'
import { toDateInputValue } from './receiptData.helpers'

function formatAddressForReceipt(address) {
  if (!address) return ''
  if (typeof address === 'string') return address

  const parts = [address.street, address.index, address.city].filter(Boolean)
  return parts.join(', ')
}

function getDefaultTotal(order) {
  if (!order) return ''
  if (typeof order.price === 'number') return String(order.price)
  if (typeof order.price === 'string') return order.price
  return ''
}

export function buildReceiptDraftFromOrder(order = {}) {
  const safeOrder = order || {}
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const dueDate = defaultDueDate.toISOString().slice(0, 10)

  return {
    customerName: safeOrder.name || '',
    customerEmail: safeOrder.email || '',
    customerAddress: formatAddressForReceipt(safeOrder.address),
    totalAmount: getDefaultTotal(safeOrder),
    serviceName: safeOrder.service?.name || '',
    serviceHours: safeOrder.duration || '',
    unitPrice: safeOrder.service?.pricePerHour || '',
    dueDate,
    invoiceNumber: safeOrder.invoiceNumber || '',
  }
}

export default function ReceiptEditDialog({
  open,
  onClose,
  onOpenReceiptPage,
  order,
  initialDraft = null,
}) {
  const baseDraft = useMemo(() => {
    const draft = initialDraft || buildReceiptDraftFromOrder(order)
    return {
      ...draft,
      dueDate: toDateInputValue(draft?.dueDate),
    }
  }, [initialDraft, order])
  const [draft, setDraft] = useState(baseDraft)
  const [totalInput, setTotalInput] = useState(baseDraft.totalAmount || '')

  useEffect(() => {
    setDraft(baseDraft)
    setTotalInput(baseDraft.totalAmount || '')
  }, [baseDraft])

  const handleChange = (key) => (event) => {
    const value = event.target.value
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleAmountChange = (event) => {
    setTotalInput(sanitizeDecimalString(event.target.value))
  }

  const handleAmountBlur = () => {
    const { formatted } = parseAndFormatDecimalString(totalInput)
    setTotalInput(formatted)
    setDraft((prev) => ({ ...prev, totalAmount: formatted }))
  }

  const handleOpenPage = () => {
    onOpenReceiptPage({
      ...draft,
      totalAmount: totalInput,
    })
  }

  return (
    <Dialog
      className="receipt-edit-dialog"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ className: 'receipt-edit-dialog-paper', style: { borderRadius: 16 } }}
    >
      <DialogTitle style={{ position: 'relative', paddingRight: 48 }}>
        <h3 className="calendar-dialog-title">Receipt data</h3>
        <IconButton
          aria-label="close"
          onClick={onClose}
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="receipt-edit-dialog-content">
        <TextField
          label="Name"
          fullWidth
          variant="outlined"
          margin="dense"
          value={draft.customerName}
          onChange={handleChange('customerName')}
        />
        <TextField
          label="Email"
          type="email"
          fullWidth
          variant="outlined"
          margin="dense"
          value={draft.customerEmail}
          onChange={handleChange('customerEmail')}
        />
        <TextField
          label="Address"
          fullWidth
          variant="outlined"
          margin="dense"
          multiline
          rows={2}
          value={draft.customerAddress}
          onChange={handleChange('customerAddress')}
        />
        <TextField
          label="Total amount"
          fullWidth
          variant="outlined"
          margin="dense"
          value={totalInput}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          placeholder="0.00"
        />
        <TextField
          label="Due date"
          type="date"
          fullWidth
          variant="outlined"
          margin="dense"
          value={draft.dueDate}
          onChange={handleChange('dueDate')}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Invoice Number"
          fullWidth
          variant="outlined"
          margin="dense"
          value={draft.invoiceNumber}
          onChange={handleChange('invoiceNumber')}
          InputLabelProps={{ shrink: true }}
        />
      </DialogContent>
      <DialogActions className="calendar-dialog-actions">
        <Button
          variant="outlined"
          color="default"
          onClick={onClose}
          className="calendar-dialog-button"
        >
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenPage}
          className="calendar-dialog-button"
        >
          Open page
        </Button>
      </DialogActions>
    </Dialog>
  )
}
