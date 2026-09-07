import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  TextField,
} from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import {
  sanitizeDecimalString,
  parseAndFormatDecimalString,
} from '../../helpers/decimalStringHelpers'
import {
  buildReceiptDraftFromOrder,
  toDateInputValue,
  normalizeReceiptDraft,
  resolveDocumentType,
} from './receiptData.helpers'

function makeBaseDraft(order, initialDraft, fallbackDocumentType) {
  const draft =
    normalizeReceiptDraft(initialDraft, fallbackDocumentType) || buildReceiptDraftFromOrder(order)

  return {
    ...draft,
    documentType: resolveDocumentType(draft?.documentType, fallbackDocumentType),
    dueDate: toDateInputValue(draft?.dueDate),
  }
}

export default function ReceiptEditDialog({
  open,
  onClose,
  onOpenReceiptPage,
  order,
  initialDraft = null,
}) {
  const fallbackDocumentType = order?.paymentType?.id === '3' ? 'invoice' : 'receipt'
  const [draft, setDraft] = useState(() =>
    makeBaseDraft(order, initialDraft, fallbackDocumentType),
  )
  const isDesktop = useMediaQuery('(min-width:601px)')

  useEffect(() => {
    setDraft(makeBaseDraft(order, initialDraft, fallbackDocumentType))
  }, [fallbackDocumentType, initialDraft, order])

  const handleChange = (key) => (event) => {
    const value = event.target.value
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleAmountChange = (event) => {
    const value = sanitizeDecimalString(event.target.value)
    setDraft((prev) => ({ ...prev, totalAmount: value }))
  }

  const handleAmountBlur = () => {
    const { formatted } = parseAndFormatDecimalString(draft.totalAmount)
    setDraft((prev) => ({ ...prev, totalAmount: formatted }))
  }

  const handleOpenPage = () => {
    onOpenReceiptPage({
      ...draft,
      documentType: resolveDocumentType(draft?.documentType, fallbackDocumentType),
    })
  }

  return (
    <Dialog
      className="calendar-order-dialog receipt-edit-dialog"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isDesktop ? 'sm' : false}
      PaperProps={{
        className: isDesktop
          ? 'calendar-order-dialog-paper receipt-edit-dialog-paper'
          : 'calendar-order-dialog-paper receipt-edit-dialog-paper receipt-edit-dialog-paper--mobile',
      }}
    >
      <DialogTitle className="calendar-order-dialog-title-wrap receipt-edit-dialog-title-wrap">
        <h3 className="calendar-dialog-title">
          {draft?.documentType === 'invoice' ? 'Invoice data' : 'Receipt data'}
        </h3>
        <IconButton
          aria-label="Close document details dialog"
          onClick={onClose}
          className="calendar-order-dialog-close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="calendar-dialog-details-content receipt-edit-dialog-content">
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
          value={draft.totalAmount ?? ''}
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
          label={draft?.documentType === 'invoice' ? 'Invoice Number' : 'Receipt Number'}
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
          variant="contained"
          color="primary"
          onClick={handleOpenPage}
          className="calendar-dialog-button"
        >
          Open document
        </Button>
        <Button
          variant="outlined"
          color="default"
          onClick={onClose}
          className="calendar-dialog-button"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
