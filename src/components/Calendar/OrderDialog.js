import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import EmailIcon from '@material-ui/icons/Email'
import TextsmsIcon from '@material-ui/icons/Textsms'
import EditIcon from '@material-ui/icons/Edit'
import DeleteIcon from '@material-ui/icons/Delete'
import { useHistory } from 'react-router-dom'
import { enqueueSnackbar } from 'notistack'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import './Calendar.css'
import { getOrderIcons, parseBoxEventId, getBoxEventTitle } from './helpers'
import orderPoolAPI from '../../services/orderPoolAPI'
import sendConfirmationEmail from '../../services/emailAPI'
import sendSMS from '../../services/smsAPI'
import Order from '../../shared/Order'
import Editor from '../Confirmator/Editor'
import OrderDialogDetails from './OrderDialogDetails'
import ReceiptEditDialog, { buildReceiptDraftFromOrder } from './ReceiptEditDialog'
import { normalizeDocumentType, normalizeReceiptDraft } from './receiptData.helpers'
import iconsData from '../../data/icons.json'

const DOCUMENT_TYPES = {
  RECEIPT: 'receipt',
  INVOICE: 'invoice',
}

export default function OrderDialog({ onClose, eventId, order: incomingOrder = null }) {
  const history = useHistory()
  const queryClient = useQueryClient()
  const [order, setOrder] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editableOrder, setEditableOrder] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptDraft, setReceiptDraft] = useState(null)
  const [receiptDocumentType, setReceiptDocumentType] = useState('receipt')
  const { orderId, eventType } = useMemo(() => parseBoxEventId(eventId), [eventId])
  const isDesktop = useMediaQuery('(min-width:601px)')

  if (!eventId) {
    return null
  }

  const handleSendEmail = useCallback(async () => {
    if (!order?.email) {
      enqueueSnackbar('Add client email before sending.', { variant: 'warning' })
      return
    }

    const transformedOrderText = Order.format(new Order(order))

    if (!transformedOrderText) {
      enqueueSnackbar('Order details are incomplete. Check required fields.', {
        variant: 'warning',
      })
      return
    }

    try {
      setSendingEmail(true)
      const response = await sendConfirmationEmail({
        orderDetails: transformedOrderText,
        order,
        email: order.email,
      })
      enqueueSnackbar(response.message || 'Email sent to client.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not send email. Please try again.', {
        variant: 'error',
      })
    } finally {
      setSendingEmail(false)
    }
  }, [order])

  const handleSendSMS = useCallback(async () => {
    if (!order?.phone) {
      enqueueSnackbar('Add client phone number before sending.', { variant: 'warning' })
      return
    }

    try {
      setSendingSMS(true)
      const response = await sendSMS({ order: new Order(order).prepareForSending() })
      enqueueSnackbar(response.message || 'SMS sent to client.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not send SMS. Please try again.', {
        variant: 'error',
      })
    } finally {
      setSendingSMS(false)
    }
  }, [order])

  const handleEdit = useCallback(() => {
    if (!order) return
    setEditableOrder(new Order(order))
    setEditOpen(true)
  }, [order])

  const handleEditClose = useCallback(() => {
    setEditOpen(false)
    setEditableOrder(null)
  }, [])

  const handleEditChange = useCallback((key, value) => {
    setEditableOrder((prev) => {
      if (!prev) return prev
      const next = new Order(prev)
      next[key] = value
      return new Order(next)
    })
  }, [])

  const handleSaveChanges = useCallback(async () => {
    if (!orderId || !editableOrder) return

    try {
      setSavingEdit(true)
      const updateData = new Order(editableOrder).prepareForSending()
      const response = await orderPoolAPI.update(orderId, updateData)
      setOrder(response.order || response)
      enqueueSnackbar(response.message || 'Order changes saved.')
      setEditOpen(false)
      setEditableOrder(null)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not save changes. Please try again.', {
        variant: 'error',
      })
    } finally {
      setSavingEdit(false)
    }
  }, [editableOrder, orderId, queryClient])

  const handleDeleteClick = useCallback(() => {
    setDeleteConfirmOpen(true)
  }, [])

  const handleDeleteConfirmClose = useCallback(() => {
    setDeleteConfirmOpen(false)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!orderId) return

    try {
      setDeleting(true)
      const response = await orderPoolAPI.remove(orderId)
      enqueueSnackbar(response.message || 'Order marked as deleted.')
      setDeleteConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      onClose()
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not delete order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }, [onClose, orderId, queryClient])

  const handleReceiptOpen = useCallback(
    (documentType) => {
      if (!order) return
      const nextDocumentType = normalizeDocumentType(documentType)

      setReceiptDocumentType(nextDocumentType)
      setReceiptDraft({
        ...buildReceiptDraftFromOrder(order),
        documentType: nextDocumentType,
      })
      setReceiptOpen(true)
    },
    [order]
  )

  const handleReceiptClose = useCallback(() => {
    setReceiptOpen(false)
  }, [])

  const handleReceiptPageOpen = useCallback(
    (draft) => {
      if (!orderId) {
        enqueueSnackbar('Order ID is missing.', { variant: 'warning' })
        return
      }

      const nextDocumentType = normalizeDocumentType(receiptDocumentType)
      const safeDraft = normalizeReceiptDraft(draft, nextDocumentType)

      if (!safeDraft) {
        enqueueSnackbar('Receipt details are invalid. Review required fields.', {
          variant: 'warning',
        })
        return
      }

      if (!safeDraft.customerEmail) {
        enqueueSnackbar('Add client email to create a receipt.', { variant: 'warning' })
        return
      }

      setReceiptDraft(safeDraft)
      setReceiptOpen(false)
      history.push(`/calendar/receipt/${orderId}`, {
        fromCalendar: true,
        documentType: nextDocumentType,
        receiptDraft: safeDraft,
      })
    },
    [history, orderId, receiptDocumentType]
  )

  useEffect(() => {
    setOrder(incomingOrder || null)
  }, [incomingOrder])

  const title = order
    ? eventType === 'boxDelivery'
      ? getBoxEventTitle(
          order,
          'boxDelivery',
          order.boxes?.deliveryDate ? dayjs(order.boxes.deliveryDate).format('HH:mm') : '',
          iconsData
        )
      : eventType === 'boxReturn'
      ? getBoxEventTitle(
          order,
          'boxReturn',
          order.boxes?.returnDate ? dayjs(order.boxes.returnDate).format('HH:mm') : '',
          iconsData
        )
      : `${getOrderIcons(order, iconsData)} ${
          order.date ? dayjs(order.date).format('HH:mm') : ''
        }(${order.duration}h) ${order.name}`
    : 'Order not found in this calendar view'

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        fullWidth={isDesktop}
        maxWidth={isDesktop ? 'sm' : false}
        className="calendar-order-dialog"
        PaperProps={
          isDesktop
            ? { className: 'calendar-order-dialog-paper' }
            : {
                style: {
                  width: '100vw',
                  maxWidth: '100vw',
                  margin: 0,
                  borderRadius: 16,
                  minHeight: 'auto',
                },
              }
        }
      >
        <DialogTitle className="calendar-order-dialog-title-wrap">
          <h3 className="calendar-dialog-title">{title}</h3>
          <IconButton aria-label="close" onClick={onClose} className="calendar-order-dialog-close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="calendar-dialog-details-content">
          <OrderDialogDetails order={order} eventType={eventType} />
        </DialogContent>
        <DialogActions className="calendar-dialog-actions">
          <div className="calendar-dialog-actions-group">
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={handleSendEmail}
              disabled={!order || !order.email || sendingEmail}
              className="calendar-dialog-button calendar-dialog-button--accent"
            >
              {sendingEmail ? 'Sending...' : 'Send email'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<TextsmsIcon />}
              onClick={handleSendSMS}
              disabled={!order || !order.phone || sendingSMS}
              className="calendar-dialog-button calendar-dialog-button--accent"
            >
              {sendingSMS ? 'Sending...' : 'Send SMS'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleReceiptOpen(DOCUMENT_TYPES.RECEIPT)}
              disabled={!order}
              className={`calendar-dialog-button calendar-dialog-button--document ${
                receiptDocumentType === DOCUMENT_TYPES.RECEIPT
                  ? 'calendar-dialog-button--document-active'
                  : ''
              }`}
            >
              Create receipt
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleReceiptOpen(DOCUMENT_TYPES.INVOICE)}
              disabled={!order}
              className={`calendar-dialog-button calendar-dialog-button--document ${
                receiptDocumentType === DOCUMENT_TYPES.INVOICE
                  ? 'calendar-dialog-button--document-active'
                  : ''
              }`}
            >
              Create invoice
            </Button>
          </div>
          <div className="calendar-dialog-actions-secondary">
            <Button
              variant="text"
              color="default"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              disabled={!order}
              className="calendar-dialog-button calendar-dialog-button--quiet"
            >
              Edit
            </Button>
            <Button
              variant="text"
              color="secondary"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
              disabled={!order}
              className="calendar-dialog-button calendar-dialog-button--danger"
            >
              Delete
            </Button>
          </div>
        </DialogActions>
      </Dialog>
      <ReceiptEditDialog
        open={receiptOpen}
        onClose={handleReceiptClose}
        onOpenReceiptPage={handleReceiptPageOpen}
        order={order}
        initialDraft={receiptDraft}
      />
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        fullWidth
        maxWidth={isDesktop ? 'md' : false}
        className="calendar-order-dialog"
        PaperProps={
          isDesktop
            ? { className: 'calendar-order-dialog-paper' }
            : {
                style: {
                  width: '100vw',
                  maxWidth: '100vw',
                  margin: 0,
                  borderRadius: 16,
                  minHeight: 'auto',
                },
              }
        }
      >
        <DialogTitle className="calendar-order-dialog-title-wrap">
          <h3 className="calendar-dialog-title">Edit order</h3>
          <IconButton
            aria-label="close"
            onClick={handleEditClose}
            className="calendar-order-dialog-close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editableOrder && <Editor order={editableOrder} handleChange={handleEditChange} />}
        </DialogContent>
        <DialogActions className="calendar-dialog-actions">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveChanges}
            className="calendar-dialog-button"
            disabled={!editableOrder || savingEdit}
          >
            Save changes
          </Button>
          <Button
            variant="outlined"
            color="default"
            onClick={handleEditClose}
            className="calendar-dialog-button"
            disabled={savingEdit}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteConfirmClose}
        className="calendar-order-dialog"
        PaperProps={{
          className: 'calendar-order-dialog-paper calendar-order-dialog-paper--narrow',
        }}
      >
        <DialogTitle className="calendar-order-dialog-title-wrap">
          <h3 className="calendar-dialog-title">Delete this order?</h3>
        </DialogTitle>
        <DialogContent>
          <p>This will remove the order from active planning.</p>
          <p className="calendar-dialog-muted-text">
            You can still restore it later from deleted orders.
          </p>
        </DialogContent>
        <DialogActions className="calendar-dialog-actions calendar-dialog-actions--compact">
          <Button
            onClick={handleDeleteConfirmClose}
            color="default"
            disabled={deleting}
            className="calendar-dialog-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="secondary"
            variant="contained"
            disabled={deleting}
            className="calendar-dialog-button calendar-dialog-button--danger-fill"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
