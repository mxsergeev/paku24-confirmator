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
import CheckIcon from '@material-ui/icons/Check'
import { useHistory } from 'react-router-dom'
import { enqueueSnackbar } from 'notistack'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import './Calendar.css'
import { getOrderIcons, parseBoxEventId, getBoxEventTitle } from './helpers'
import orderPoolAPI from '../../services/orderPoolAPI'
import sendConfirmationEmail, { sendCancellationEmail } from '../../services/emailAPI'
import sendSMS, { sendCancellationSMS } from '../../services/smsAPI'
import Order from '../../shared/Order'
import Editor from '../Confirmator/Editor'
import OrderSettings from '../Confirmator/OrderSettings'
import OrderDialogDetails from './OrderDialogDetails'
import ReceiptEditDialog, { buildReceiptDraftFromOrder } from './ReceiptEditDialog'
import { normalizeDocumentType, normalizeReceiptDraft } from './receiptData.helpers'
import iconsData from '../../data/icons.json'

const DOCUMENT_TYPES = {
  RECEIPT: 'receipt',
  INVOICE: 'invoice',
}

export default function OrderDialog({
  onClose,
  eventId,
  order: incomingOrder = null,
  onOrderUpdate,
}) {
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
  const [changingEventColor, setChangingEventColor] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptDraft, setReceiptDraft] = useState(null)
  const [receiptDocumentType, setReceiptDocumentType] = useState('receipt')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false) // Dialog for canceling order
  const [canceling, setCanceling] = useState(false) // Loading state for cancel request
  const [messageType, setMessageType] = useState(null) // 'email' or 'sms'
  const [showMessageOptions, setShowMessageOptions] = useState(false) // Управляет отображением кнопок выбора email/SMS
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

  const handleConfirm = useCallback(async () => {
    if (!order?.id) return

    try {
      await orderPoolAPI.confirm(order.id)
      setOrder((prevOrder) =>
        prevOrder ? new Order({ ...prevOrder, confirmedAt: new Date().toISOString() }) : prevOrder
      )
      if (onOrderUpdate) {
        onOrderUpdate()
      }
    } catch (err) {
      enqueueSnackbar('Failed to confirm order. Please try again.', { variant: 'error' })
    } finally {
      setConfirmDialogOpen(false)
    }
  }, [order, onOrderUpdate])

  const handleEdit = useCallback(() => {
    if (!order) return

    const normalizedOrder = new Order(order)
    normalizedOrder.extraAddresses = (normalizedOrder.extraAddresses || []).map(
      (address, index) => ({
        ...address,
        id: address?.id || `${Date.now()}-${index}`,
      })
    )

    setEditableOrder(new Order(normalizedOrder))
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
      updateData.eventColor = editableOrder?.color ?? null
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

  const handleEventColorChange = useCallback(
    async (eventColor) => {
      if (!orderId || !order) return

      const nextEventColor = eventColor || null
      const currentEventColor = order?.eventColor ?? order?.color ?? null

      if (nextEventColor === currentEventColor) {
        return
      }

      const previousOrder = order
      const previousCalendarOrdersCache = queryClient.getQueriesData({
        queryKey: ['calendar-orders'],
      })

      const applyOrderColorInCache = (orderPatch) => {
        queryClient.setQueriesData({ queryKey: ['calendar-orders'] }, (cachedOrders) => {
          if (!Array.isArray(cachedOrders)) return cachedOrders

          return cachedOrders.map((cachedOrder) => {
            if (String(cachedOrder?.id) !== String(orderId)) {
              return cachedOrder
            }

            return {
              ...cachedOrder,
              ...orderPatch,
            }
          })
        })
      }

      try {
        setChangingEventColor(true)

        const nextOrder = new Order(order)
        nextOrder.eventColor = nextEventColor

        setOrder(new Order(nextOrder))
        applyOrderColorInCache({ color: nextEventColor, eventColor: nextEventColor })

        const updateData = new Order(nextOrder).prepareForSending()
        updateData.eventColor = nextEventColor
        const response = await orderPoolAPI.update(orderId, updateData)

        const resolvedOrder = new Order(response?.order || response || nextOrder)

        setOrder(resolvedOrder)
        applyOrderColorInCache({
          color: resolvedOrder?.color ?? null,
          eventColor: resolvedOrder?.eventColor ?? null,
        })
        enqueueSnackbar(response?.message || 'Event color updated.', { variant: 'success' })
        queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      } catch (err) {
        setOrder(previousOrder)
        previousCalendarOrdersCache.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
        if (err.message === 'logout') return
        enqueueSnackbar(
          err.response?.data?.error || 'Could not update event color. Please try again.',
          {
            variant: 'error',
          }
        )
      } finally {
        setChangingEventColor(false)
      }
    },
    [order, orderId, queryClient]
  )

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
      const receiptUrl = `/calendar/receipt/${orderId}`
      const receiptState = {
        fromCalendar: true,
        documentType: nextDocumentType,
        receiptDraft: safeDraft,
      }
      const newWindow = window.open(receiptUrl, '_blank')
      if (newWindow) {
        newWindow.state = receiptState
      } else {
        enqueueSnackbar('Failed to open new tab. Please check your browser settings.', {
          variant: 'error',
        })
      }
    },
    [history, orderId, receiptDocumentType]
  )

  useEffect(() => {
    setOrder(incomingOrder ? new Order(incomingOrder) : null)
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

  const isConfirmedOrder = Boolean(order?.confirmedAt)

  const handleConfirmDialogOpen = () => {
    setConfirmDialogOpen(true)
  }

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false)
  }

  const isCanceledOrder = Boolean(order?.canceledAt)

  const handleCancelConfirmOpen = useCallback(() => {
    setCancelConfirmOpen(true)
    setShowMessageOptions(false)
    setMessageType(null)
  }, [])

  const handleCancelConfirmClose = useCallback(() => {
    setCancelConfirmOpen(false)
    setShowMessageOptions(false)
    setMessageType(null)
  }, [])

  const handleCancelConfirmDirect = useCallback(async () => {
    if (!orderId || !order) return

    try {
      setCanceling(true)
      const response = await orderPoolAPI.cancel(orderId)
      const updatedOrder = response.order || response
      setOrder(new Order(updatedOrder))
      enqueueSnackbar(response.message || 'Order canceled successfully.')
      setCancelConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder)
      }
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not cancel order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setCanceling(false)
    }
  }, [orderId, order, queryClient, onOrderUpdate])

  const handleCancelConfirmAndSendMessage = useCallback(
    async (messageTypeToSend) => {
      if (!orderId || !order) return

      try {
        setCanceling(true)
        // First cancel the order
        const response = await orderPoolAPI.cancel(orderId)
        const updatedOrder = response.order || response
        setOrder(new Order(updatedOrder))

        // Then send message if needed
        if (messageTypeToSend === 'email' && order?.email) {
          try {
            await sendCancellationEmail({
              order,
              email: order.email,
            })
          } catch (err) {
            console.error('Could not send cancellation email:', err)
          }
        } else if (messageTypeToSend === 'sms' && order?.phone) {
          try {
            await sendCancellationSMS({ order })
          } catch (err) {
            console.error('Could not send cancellation SMS:', err)
          }
        }

        enqueueSnackbar(response.message || 'Order canceled and message sent.')
        setCancelConfirmOpen(false)
        setShowMessageOptions(false)
        queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
        if (onOrderUpdate) {
          onOrderUpdate(updatedOrder)
        }
      } catch (error) {
        if (error.message === 'logout') return
        enqueueSnackbar(
          error.response?.data?.error || 'Failed to complete action. Please try again.',
          {
            variant: 'error',
          }
        )
      } finally {
        setCanceling(false)
      }
    },
    [orderId, order, queryClient, onOrderUpdate]
  )

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
          <OrderDialogDetails
            order={order}
            eventType={eventType}
            onEventColorChange={handleEventColorChange}
            changingEventColor={changingEventColor}
          />
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
            {!isConfirmedOrder && (
              <Button
                variant="text"
                color="default"
                disabled={!order}
                startIcon={<CheckIcon />}
                className="calendar-dialog-button"
                onClick={handleConfirmDialogOpen}
              >
                Confirm order
              </Button>
            )}
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
            {(!isConfirmedOrder || isCanceledOrder) && (
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
        onClose={handleConfirmDialogClose}
        className="calendar-order-dialog"
      >
        <DialogTitle>Confirm Order</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to confirm this order?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="default">
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
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        scroll="body"
        fullWidth={false}
        maxWidth={false}
        className="calendar-order-dialog"
        PaperProps={
          isDesktop
            ? { className: 'calendar-order-dialog-paper calendar-new-order-dialog-paper' }
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
        <DialogContent className="calendar-new-order-dialog-content">
          <div className="calendar-new-order-dialog-content-wrap">
            <div className="calendar-new-order-flex-container">
              <Editor order={editableOrder} handleChange={handleEditChange} />
              {editableOrder && (
                <OrderSettings order={editableOrder} handleChange={handleEditChange} />
              )}
            </div>
          </div>
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
      <Dialog
        open={cancelConfirmOpen}
        onClose={handleCancelConfirmClose}
        className="calendar-order-dialog"
        PaperProps={{
          className: 'calendar-order-dialog-paper calendar-order-dialog-paper--narrow',
        }}
      >
        <DialogTitle className="calendar-order-dialog-title-wrap">
          <h3 className="calendar-dialog-title">Cancel this order?</h3>
        </DialogTitle>
        <DialogContent>
          <p>Are you sure you want to cancel this order?</p>
          {!showMessageOptions && (
            <p className="calendar-dialog-muted-text">
              You can notify the client via email or SMS.
            </p>
          )}
        </DialogContent>
        <DialogActions className="calendar-dialog-actions calendar-dialog-actions--compact">
          <Button
            onClick={handleCancelConfirmClose}
            color="default"
            disabled={canceling}
            className="calendar-dialog-button"
          >
            Keep order
          </Button>
          {!showMessageOptions ? (
            <>
              <Button
                onClick={handleCancelConfirmDirect}
                color="secondary"
                variant="contained"
                disabled={canceling}
                className="calendar-dialog-button calendar-dialog-button--danger-fill"
              >
                {canceling ? 'Canceling...' : 'Cancel only'}
              </Button>
              <Button
                onClick={() => setShowMessageOptions(true)}
                color="secondary"
                variant="outlined"
                disabled={canceling}
                className="calendar-dialog-button"
              >
                Cancel & notify
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setShowMessageOptions(false)}
                color="default"
                disabled={canceling}
                className="calendar-dialog-button"
              >
                Back
              </Button>
              <Button
                onClick={() => handleCancelConfirmAndSendMessage('email')}
                color="primary"
                variant="contained"
                disabled={!order?.email || canceling}
                className="calendar-dialog-button"
              >
                {canceling ? 'Sending...' : 'Send email & cancel'}
              </Button>
              <Button
                onClick={() => handleCancelConfirmAndSendMessage('sms')}
                color="primary"
                variant="contained"
                disabled={!order?.phone || canceling}
                className="calendar-dialog-button"
              >
                {canceling ? 'Sending...' : 'Send SMS & cancel'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}
