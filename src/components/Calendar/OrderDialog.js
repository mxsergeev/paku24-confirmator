import React, { useState } from 'react'
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
import CheckIcon from '@material-ui/icons/Check'
import { enqueueSnackbar } from 'notistack'
import { useHistory } from 'react-router-dom'
import './Calendar.css'
import { getOrderIcons, parseBoxEventId, getBoxEventTitle } from './helpers'
import OrderDialogDetails from './OrderDialogDetails'
import ReceiptEditDialog from './ReceiptEditDialog'
import EditOrderDialog from './EditOrderDialog'
import DeleteOrderDialog from './DeleteOrderDialog'
import CancelOrderDialog from './CancelOrderDialog'
import iconsData from '../../data/icons.json'
import colors from '../../shared/colors'
import ordersAPI from '../../services/ordersAPI'
import sendConfirmationEmail, { sendCancellationEmail } from '../../services/emailAPI'
import sendSMS, { sendCancellationSMS } from '../../services/smsAPI'
import { cloneValue } from '../../shared/orderPrimitives'
import { updateOrderField } from '../../shared/orderModel'
import { toOrderPayload } from '../../shared/orderSerialization'
import { isCanceled, isDeleted, isConfirmed } from '../../shared/orderState.helpers'
import { hexToRgba } from '../../shared/color.helpers'
import {
  buildReceiptDraftFromOrder,
  normalizeDocumentType,
  normalizeReceiptDraft,
} from './receiptData.helpers'
import {
  formatHelsinkiInstant,
  isDateOnly,
  parseCalendarDate,
} from '../../shared/date-fns-tz'

const DOCUMENT_TYPES = {
  RECEIPT: 'receipt',
  INVOICE: 'invoice',
}

function formatDialogEventTime(value, fieldName) {
  if (!value) return ''
  if (isDateOnly(value)) {
    parseCalendarDate(value, fieldName)
    return ''
  }

  return formatHelsinkiInstant(value, 'HH:mm', fieldName)
}

export default function OrderDialog({
  onClose,
  eventId,
  order: incomingOrder = null,
  onOrderUpdate,
}) {
  const order = incomingOrder

  const { orderId, eventType } = parseBoxEventId(eventId)
  const isDesktop = useMediaQuery('(min-width:601px)')
  const history = useHistory()

  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editableOrder, setEditableOrder] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState('soft')
  const [deleting, setDeleting] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptDraft, setReceiptDraft] = useState(null)
  const [receiptDocumentType, setReceiptDocumentType] = useState(DOCUMENT_TYPES.RECEIPT)

  const handleSendEmail = async () => {
    if (isDeleted(order)) {
      enqueueSnackbar('Deleted orders cannot send messages.', { variant: 'warning' })
      return
    }
    if (!order?.email) {
      enqueueSnackbar('Add client email before sending.', { variant: 'warning' })
      return
    }

    try {
      setSendingEmail(true)
      const response = isCanceled(order)
        ? await sendCancellationEmail({ orderId })
        : await sendConfirmationEmail({ orderId })

      enqueueSnackbar(response.message || 'Email sent to client.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not send email. Please try again.', {
        variant: 'error',
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSendSMS = async () => {
    if (isDeleted(order)) {
      enqueueSnackbar('Deleted orders cannot send messages.', { variant: 'warning' })
      return
    }
    if (!order?.phone) {
      enqueueSnackbar('Add client phone number before sending.', { variant: 'warning' })
      return
    }

    try {
      setSendingSMS(true)
      const response = isCanceled(order)
        ? await sendCancellationSMS({ orderId })
        : await sendSMS({ orderId })

      enqueueSnackbar(response.message || 'SMS sent to client.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not send SMS. Please try again.', {
        variant: 'error',
      })
    } finally {
      setSendingSMS(false)
    }
  }

  const handleConfirm = async () => {
    if (!order?.id) return

    try {
      const response = await ordersAPI.confirm(order.id)
      await onOrderUpdate?.()
      if (response.message) enqueueSnackbar(response.message)
    } catch (err) {
      enqueueSnackbar('Failed to confirm order. Please try again.', { variant: 'error' })
    } finally {
      setConfirmDialogOpen(false)
    }
  }

  const handleEdit = () => {
    if (!order) return

    setEditableOrder(cloneValue(order))
    setEditOpen(true)
  }

  const handleEditClose = () => {
    setEditOpen(false)
    setEditableOrder(null)
  }

  const handleEditChange = (key, value) =>
    setEditableOrder((previous) => (previous ? updateOrderField(previous, key, value) : previous))

  const handleSaveChanges = async () => {
    if (!orderId || !editableOrder) return

    try {
      setSavingEdit(true)
      const response = await ordersAPI.update(orderId, toOrderPayload(editableOrder))
      enqueueSnackbar(response.message || 'Order changes saved.')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
      setEditOpen(false)
      setEditableOrder(null)
      await onOrderUpdate?.()
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not save changes. Please try again.', {
        variant: 'error',
      })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteClick = () => {
    setDeleteMode(isDeleted(order) ? 'permanent' : 'soft')
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirmClose = () => {
    setDeleteConfirmOpen(false)
    setDeleteMode('soft')
  }

  const handleDeleteConfirm = async () => {
    if (!orderId) return

    try {
      setDeleting(true)
      const response =
        deleteMode === 'permanent'
          ? await ordersAPI.removePermanently(orderId)
          : await ordersAPI.remove(orderId)
      enqueueSnackbar(
        response.message ||
          (deleteMode === 'permanent' ? 'Order permanently deleted.' : 'Order marked as deleted.')
      )

      setDeleteConfirmOpen(false)
      setDeleteMode('soft')
      await onOrderUpdate?.()
      onClose()
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not delete order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleRestore = async () => {
    if (!orderId) return
    try {
      const response = await ordersAPI.restore(orderId)
      enqueueSnackbar(response.message || 'Order restored')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
      await onOrderUpdate?.()
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not restore order. Please try again.', {
        variant: 'error',
      })
    }
  }

  const handleCancelConfirmOpen = () => {
    setCancelConfirmOpen(true)
  }

  const handleCancelConfirmClose = () => {
    setCancelConfirmOpen(false)
  }

  const cancelAndUpdate = async (id) => {
    if (!id) throw new Error('missing order id')
    const response = await ordersAPI.cancel(id)
    const updatedOrder = response.order || response
    await onOrderUpdate?.()
    return { response, updatedOrder }
  }

  const handleCancelConfirmDirect = async () => {
    if (!orderId) return
    if (isDeleted(order)) {
      enqueueSnackbar('Deleted orders cannot be canceled.', { variant: 'warning' })
      return
    }

    try {
      setCanceling(true)
      const { response } = await cancelAndUpdate(orderId)
      enqueueSnackbar(response.message || 'Order canceled successfully.')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
      setCancelConfirmOpen(false)
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not cancel order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setCanceling(false)
    }
  }

  const handleCancelAndNotify = async () => {
    if (!orderId) return
    if (isDeleted(order)) {
      enqueueSnackbar('Deleted orders cannot be canceled or notified.', { variant: 'warning' })
      return
    }

    try {
      setCanceling(true)
      const { response, updatedOrder } = await cancelAndUpdate(orderId)
      const notificationRequests = []

      if (updatedOrder?.email) {
        notificationRequests.push(sendCancellationEmail({ orderId }))
      }
      if (updatedOrder?.phone) {
        notificationRequests.push(sendCancellationSMS({ orderId }))
      }

      if (notificationRequests.length === 0) {
        enqueueSnackbar(response.message || 'Order canceled.')
      } else {
        const results = await Promise.allSettled(notificationRequests)
        const fulfilled = results.filter((result) => result.status === 'fulfilled').length
        const rejected = results.filter((result) => result.status === 'rejected').length
        let message = `${response.message || 'Order canceled.'} Notifications: `
        if (fulfilled) message += `${fulfilled} sent`
        if (rejected) message += (fulfilled ? ', ' : '') + `${rejected} failed`
        enqueueSnackbar(message)
      }
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }

      setCancelConfirmOpen(false)
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not cancel order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setCanceling(false)
    }
  }

  async function handleEventColorChange(_field, eventColor) {
    if (!orderId) return

    try {
      const response = await ordersAPI.update(orderId, { eventColor })
      await onOrderUpdate?.()
      enqueueSnackbar(response.message || 'Event color updated.')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(
        err.response?.data?.error || 'Could not change event color.',
        { variant: 'error' },
      )
    }
  }

  const handleReceiptOpen = (documentType) => {
    if (!order) return

    const nextDocumentType = normalizeDocumentType(documentType)
    setReceiptDocumentType(nextDocumentType)
    setReceiptDraft({
      ...buildReceiptDraftFromOrder(order),
      documentType: nextDocumentType,
    })
    setReceiptOpen(true)
  }

  const handleReceiptClose = () => {
    setReceiptOpen(false)
  }

  const handleReceiptPageOpen = (draft) => {
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
    const storageKey = `receipt-draft:${orderId}`
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ ...safeDraft, documentType: nextDocumentType }),
      )
    } catch {
      enqueueSnackbar('Could not save receipt details for the new tab. Please try again.', {
        variant: 'error',
      })
      return
    }

    let newWindow = null
    try {
      const receiptUrl = history.createHref({
        pathname: `/calendar/receipt/${encodeURIComponent(orderId)}`,
      })
      newWindow = window.open(receiptUrl, '_blank')
    } catch {
      // Treat browser popup errors like a blocked popup below.
    }

    if (newWindow) {
      setReceiptOpen(false)
      return
    }

    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // Best effort cleanup when opening the receipt page is blocked.
    }
    enqueueSnackbar('Failed to open new tab. Please check your browser settings.', {
      variant: 'error',
    })
  }

  const title = order
    ? eventType === 'boxDelivery'
      ? getBoxEventTitle(
          order,
          'boxDelivery',
          formatDialogEventTime(order.boxes?.deliveryDate, 'box delivery date'),
          iconsData
        )
      : eventType === 'boxReturn'
      ? getBoxEventTitle(
          order,
          'boxReturn',
          formatDialogEventTime(order.boxes?.returnDate, 'box return date'),
          iconsData
        )
      : `${getOrderIcons(order, iconsData)} ${formatDialogEventTime(order.date, 'order date')}(${order.duration}h) ${order.name}`
    : 'Order not found in this calendar view'

  const isConfirmedOrder = isConfirmed(order)
  const isDeletedOrder = isDeleted(order)

  const isCanceledOrder = isCanceled(order)

  let headerBg = '#3937375d'
  if (!isDeletedOrder) {
    headerBg = '#dedddd'
    if (isConfirmedOrder) {
      headerBg = isCanceledOrder
        ? '#616161'
        : hexToRgba(
            colors[String(order?.eventColor ?? '')]?.hex || colors['7']?.hex || '#039be5',
            0.62,
          )
    }
  }

  const titleWithStatus = `${title}${
    isDeletedOrder ? ' (DELETED)' : isCanceledOrder ? ' (CANCELED)' : ''
  }`

  if (!eventId) {
    return null
  }

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
            ? { className: 'calendar-order-dialog-paper calendar-order-dialog-paper--no-border' }
            : {
                style: {
                  width: '100vw',
                  maxWidth: '100vw',
                  margin: 0,
                  borderRadius: 16,
                  minHeight: 'auto',
                  border: 'none',
                },
              }
        }
      >
        <DialogTitle className="calendar-order-dialog-title-wrap" style={{ background: headerBg }}>
          <h3 className="calendar-dialog-title">
            {isDeletedOrder ? (
              <span className="calendar-dialog-title-icon calendar-dialog-title-icon--deleted">
                ❗️
              </span>
            ) : !isConfirmedOrder ? (
              <span className="calendar-dialog-title-icon calendar-dialog-title-icon--unconfirmed">
                ❓
              </span>
            ) : null}
            {titleWithStatus}
          </h3>
          <IconButton aria-label="close" onClick={onClose} className="calendar-order-dialog-close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="calendar-dialog-details-content">
          <OrderDialogDetails
            order={order}
            eventType={eventType}
            onEventColorChange={handleEventColorChange}
          />
        </DialogContent>
        <DialogActions className="calendar-dialog-actions">
          {!isCanceledOrder && !isDeletedOrder && isConfirmedOrder && (
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
          )}
          <div className="calendar-dialog-actions-secondary">
            {!isConfirmedOrder && !isDeletedOrder && (
              <Button
                variant="text"
                color="default"
                disabled={!order}
                startIcon={<CheckIcon />}
                className="calendar-dialog-button"
                onClick={() => setConfirmDialogOpen(true)}
              >
                Confirm order
              </Button>
            )}
            {!isCanceledOrder && !isDeletedOrder && (
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
            )}
            {(isCanceledOrder || isDeletedOrder) && (
              <Button
                variant="text"
                color="default"
                startIcon={<CheckIcon />}
                onClick={handleRestore}
                disabled={!order}
                className="calendar-dialog-button calendar-dialog-button--quiet"
              >
                Restore
              </Button>
            )}
            {(!isConfirmedOrder || isCanceledOrder) && (
              <Button
                variant="text"
                color="secondary"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
                disabled={!order}
                className="calendar-dialog-button calendar-dialog-button--danger"
              >
                {isDeletedOrder ? 'Delete permanently' : 'Delete'}
              </Button>
            )}
            {isConfirmedOrder && !isCanceledOrder && (
              <Button
                variant="text"
                color="secondary"
                startIcon={<DeleteIcon />}
                onClick={handleCancelConfirmOpen}
                disabled={!order || canceling}
                className="calendar-dialog-button calendar-dialog-button--danger"
              >
                {canceling ? 'Canceling...' : 'Cancel order'}
              </Button>
            )}
          </div>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        className="calendar-order-dialog"
      >
        <DialogTitle>Confirm Order</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to confirm this order?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="default">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <ReceiptEditDialog
        open={receiptOpen}
        onClose={handleReceiptClose}
        onOpenReceiptPage={handleReceiptPageOpen}
        order={order}
        initialDraft={receiptDraft}
      />
      <EditOrderDialog
        open={editOpen}
        onClose={handleEditClose}
        isDesktop={isDesktop}
        order={editableOrder}
        onChange={handleEditChange}
        onOrderChange={setEditableOrder}
        onSave={handleSaveChanges}
        saving={savingEdit}
      />
      <DeleteOrderDialog
        open={deleteConfirmOpen}
        onClose={handleDeleteConfirmClose}
        deleteMode={deleteMode}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />
      <CancelOrderDialog
        open={cancelConfirmOpen}
        onClose={handleCancelConfirmClose}
        onCancelOnly={handleCancelConfirmDirect}
        onCancelAndNotify={handleCancelAndNotify}
        canceling={canceling}
      />
    </>
  )
}
