import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
import Editor from '../Confirmator/Editor'
import OrderSettings from '../Confirmator/OrderSettings'
import OrderDialogDetails from './OrderDialogDetails'
import ReceiptEditDialog from './ReceiptEditDialog'
import {
  buildReceiptDraftFromOrder,
  normalizeDocumentType,
  normalizeReceiptDraft,
} from './receiptData.helpers'
import iconsData from '../../data/icons.json'
import colors from '../../shared/colors'
import {
  hydrateCanonicalOrder,
  updateOrderField,
} from '../../shared/orderModel'
import { toCommunicationOrder, toUpdateOrderPayload } from '../../shared/orderSerialization'
import { isCanceled, isDeleted, isConfirmed } from '../../shared/orderState.helpers'
import { hexToRgba } from '../../shared/color.helpers'

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
  const [revertingEdit, setRevertingEdit] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState('soft')
  const [deleting, setDeleting] = useState(false)
  const [changingEventColor, setChangingEventColor] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptDraft, setReceiptDraft] = useState(null)
  const [receiptDocumentType, setReceiptDocumentType] = useState('receipt')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false) // Dialog for canceling order
  const [canceling, setCanceling] = useState(false) // Loading state for cancel request

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

    try {
      setSendingEmail(true)
      const canceled = isCanceled(order)
      const communicationOrder = toCommunicationOrder(order)
      let response
      if (canceled) {
        response = await sendCancellationEmail({
          order: communicationOrder,
          email: order.email,
        })
      } else {
        response = await sendConfirmationEmail({
          order: communicationOrder,
          email: order.email,
        })
      }

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
      const canceled = isCanceled(order)
      const communicationOrder = toCommunicationOrder(order)
      let response
      if (canceled) {
        response = await sendCancellationSMS({ order: communicationOrder })
      } else {
        response = await sendSMS({ order: communicationOrder })
      }
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
      const response = await orderPoolAPI.confirm(order.id)
      const updatedOrder = hydrateCanonicalOrder(response.order || response)
      setOrder(updatedOrder)
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder)
      }
    } catch (err) {
      enqueueSnackbar('Failed to confirm order. Please try again.', { variant: 'error' })
    } finally {
      setConfirmDialogOpen(false)
    }
  }, [order, onOrderUpdate])

  const handleEdit = useCallback(() => {
    if (!order) return

    setEditableOrder(hydrateCanonicalOrder(order))
    setEditOpen(true)
  }, [order])

  const handleEditClose = useCallback(() => {
    setEditOpen(false)
    setEditableOrder(null)
  }, [])

  const handleEditChange = useCallback(
    (key, value) => setEditableOrder((prev) => (prev ? updateOrderField(prev, key, value) : prev)),
    []
  )

  const handleSaveChanges = useCallback(async () => {
    if (!orderId || !editableOrder) return

    try {
      setSavingEdit(true)
      const updateData = toUpdateOrderPayload(editableOrder)

      const response = await orderPoolAPI.update(orderId, updateData)
      setOrder(hydrateCanonicalOrder(response.order || response))
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

  const handleRevertEdit = useCallback(async () => {
    if (!orderId || !editableOrder) return

    try {
      setRevertingEdit(true)
      const response = await orderPoolAPI.revert(orderId)
      const updatedOrder = hydrateCanonicalOrder(response.order || response)

      setOrder(updatedOrder)
      setEditableOrder(updatedOrder)
      onOrderUpdate?.(updatedOrder)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      enqueueSnackbar(response.message || 'Order reverted.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not revert order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setRevertingEdit(false)
    }
  }, [editableOrder, onOrderUpdate, orderId, queryClient])

  const handleDeleteClick = useCallback(() => {
    setDeleteMode(isDeleted(order) ? 'permanent' : 'soft')
    setDeleteConfirmOpen(true)
  }, [order])

  const handleDeleteConfirmClose = useCallback(() => {
    setDeleteConfirmOpen(false)
    setDeleteMode('soft')
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!orderId) return

    try {
      setDeleting(true)
      let response
      if (deleteMode === 'permanent') {
        response = await orderPoolAPI.removePermanently(orderId)
        enqueueSnackbar(response.message || 'Order permanently deleted.')
      } else {
        response = await orderPoolAPI.remove(orderId)
        enqueueSnackbar(response.message || 'Order marked as deleted.')
      }

      setDeleteConfirmOpen(false)
      setDeleteMode('soft')
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
  }, [deleteMode, onClose, orderId, queryClient])

  const debounceTimerRef = useRef(null)

  const handleEventColorChange = useCallback(
    async (eventColor) => {
      if (!orderId || !order) return

      const previousOrder = hydrateCanonicalOrder(order)
      const previousCalendarOrdersCache = queryClient.getQueriesData(['calendar-orders'])

      try {
        setChangingEventColor(true)

        // Validate eventColor before proceeding
        if (!eventColor || typeof eventColor !== 'string') {
          throw new Error('Invalid event color provided.')
        }

        const nextOrder = updateOrderField(order, 'eventColor', eventColor)

        setOrder(nextOrder)
        applyOrderColorInCache(eventColor)

        // Use lightweight color-only endpoint to avoid sending full order
        const response = await orderPoolAPI.updateColor(orderId, eventColor)

        const resolvedOrder = hydrateCanonicalOrder(response?.order || response || nextOrder)

        setOrder(resolvedOrder)
        applyOrderColorInCache(resolvedOrder?.eventColor ?? null)
        enqueueSnackbar(response?.message || 'Event color updated.', { variant: 'success' })
        queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      } catch (err) {
        setOrder(previousOrder) // Restore the previous order state
        previousCalendarOrdersCache.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data) // Restore the cache state
        })
        if (err.message === 'logout') return
        enqueueSnackbar(
          err.response?.data?.error ||
            err.message ||
            'Could not update event color. Please try again.',
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

  const debouncedHandleEventColorChange = useCallback(
    (eventColor) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => handleEventColorChange(eventColor), 300)
    },
    [handleEventColorChange]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

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
    setOrder(incomingOrder ? hydrateCanonicalOrder(incomingOrder) : null)
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

  const isConfirmedOrder = isConfirmed(order)
  const isDeletedOrder = isDeleted(order)

  const handleConfirmDialogOpen = () => {
    setConfirmDialogOpen(true)
  }

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false)
  }

  const isCanceledOrder = isCanceled(order)

  const headerBg = useMemo(() => {
    let bgColor

    if (isDeletedOrder) {
      bgColor = '#3937375d'
    } else if (!isConfirmedOrder) {
      bgColor = '#dedddd'
    } else if (isCanceledOrder) {
      bgColor = '#616161'
    } else {
      // Use the order's canonical event color for confirmed orders (default)
      const colorId = String(order?.eventColor ?? '')
      const hex = colors[colorId]?.hex || colors['7']?.hex || '#039be5'
      bgColor = hexToRgba(hex, 0.62)
    }

    return bgColor
  }, [order, isDeletedOrder, isConfirmedOrder, isCanceledOrder])

  const titleWithStatus = `${title}${
    isDeletedOrder ? ' (DELETED)' : isCanceledOrder ? ' (CANCELED)' : ''
  }`

  const handleRestore = useCallback(async () => {
    if (!orderId) return
    try {
      const response = await orderPoolAPI.restore(orderId)
      const updated = hydrateCanonicalOrder(response.order || response)
      setOrder(updated)
      enqueueSnackbar(response.message || 'Order restored')
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      if (onOrderUpdate) onOrderUpdate(updated)
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not restore order. Please try again.', {
        variant: 'error',
      })
    }
  }, [orderId, onOrderUpdate, queryClient])

  const handleCancelConfirmOpen = useCallback(() => {
    setCancelConfirmOpen(true)
  }, [])

  const handleCancelConfirmClose = useCallback(() => {
    setCancelConfirmOpen(false)
  }, [])
  // Helper: cancel order, update state and cache, and return result
  const cancelAndUpdate = useCallback(
    async (id) => {
      if (!id) throw new Error('missing order id')
      const response = await orderPoolAPI.cancel(id)
      const updatedOrder = hydrateCanonicalOrder(response.order || response)
      setOrder(updatedOrder)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      if (onOrderUpdate) onOrderUpdate(updatedOrder)
      return { response, updatedOrder }
    },
    [queryClient, onOrderUpdate]
  )

  const handleCancelConfirmDirect = useCallback(async () => {
    if (!orderId) return

    try {
      setCanceling(true)
      const { response } = await cancelAndUpdate(orderId)
      enqueueSnackbar(response.message || 'Order canceled successfully.')
      setCancelConfirmOpen(false)
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not cancel order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setCanceling(false)
    }
  }, [orderId, cancelAndUpdate])

  const handleCancelAndNotify = useCallback(async () => {
    if (!orderId) return

    try {
      setCanceling(true)
      const { response, updatedOrder } = await cancelAndUpdate(orderId)

      const sendPromises = []
      const communicationOrder = toCommunicationOrder(updatedOrder)
      if (updatedOrder?.email) {
        sendPromises.push(
          sendCancellationEmail({
            order: communicationOrder,
            email: updatedOrder.email,
          })
        )
      }
      if (updatedOrder?.phone) {
        sendPromises.push(sendCancellationSMS({ order: communicationOrder }))
      }

      if (sendPromises.length > 0) {
        const results = await Promise.allSettled(sendPromises)
        const fulfilled = results.filter((r) => r.status === 'fulfilled').length
        const rejected = results.filter((r) => r.status === 'rejected').length
        let msg = response.message || 'Order canceled.'
        msg += ' Notifications: '
        if (fulfilled) msg += `${fulfilled} sent`
        if (rejected) msg += (fulfilled ? ', ' : '') + `${rejected} failed`
        enqueueSnackbar(msg)
      } else {
        enqueueSnackbar(response.message || 'Order canceled.')
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
  }, [orderId, cancelAndUpdate])

  const applyOrderColorInCache = useCallback(
    (eventColor) => {
      if (!eventColor) return

      const cachedOrders = queryClient.getQueriesData(['calendar-orders'])
      cachedOrders.forEach(([queryKey, data]) => {
        let changed = false
        const updateCachedOrder = (cachedOrder) => {
          if (!cachedOrder) return cachedOrder
          const cachedOrderId = cachedOrder.id ?? cachedOrder._id
          if (String(cachedOrderId) !== String(orderId)) return cachedOrder
          changed = true
          return { ...cachedOrder, eventColor }
        }

        if (Array.isArray(data)) {
          const updatedOrders = data.map(updateCachedOrder)
          if (changed) queryClient.setQueryData(queryKey, updatedOrders)
        } else if (Array.isArray(data?.orders)) {
          const updatedOrders = data.orders.map(updateCachedOrder)
          if (changed) {
            queryClient.setQueryData(queryKey, { ...data, orders: updatedOrders })
          }
        } else {
          const updatedOrder = updateCachedOrder(data)
          if (updatedOrder !== data) queryClient.setQueryData(queryKey, updatedOrder)
        }
      })
    },
    [orderId, queryClient]
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
            onEventColorChange={debouncedHandleEventColorChange}
            changingEventColor={changingEventColor}
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
                onClick={handleConfirmDialogOpen}
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
              <Editor
                order={editableOrder}
                handleChange={handleEditChange}
                onOrderChange={setEditableOrder}
                onRevert={handleRevertEdit}
                reverting={revertingEdit}
              />
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
            disabled={!editableOrder || savingEdit || revertingEdit}
          >
            Save changes
          </Button>
          <Button
            variant="outlined"
            color="default"
            onClick={handleEditClose}
            className="calendar-dialog-button"
            disabled={savingEdit || revertingEdit}
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
          <h3 className="calendar-dialog-title">
            {deleteMode === 'permanent' ? 'Delete permanently?' : 'Delete this order?'}
          </h3>
        </DialogTitle>
        <DialogContent>
          {deleteMode === 'permanent' ? (
            <>
              <p>This will permanently remove the order from the database.</p>
              <p className="calendar-dialog-muted-text">This action cannot be undone.</p>
            </>
          ) : (
            <>
              <p>This will remove the order from active planning.</p>
              <p className="calendar-dialog-muted-text">
                You can still restore it later from deleted orders.
              </p>
            </>
          )}
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
            {deleting
              ? 'Deleting...'
              : deleteMode === 'permanent'
              ? 'Delete permanently'
              : 'Delete'}
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
          <p className="calendar-dialog-muted-text">
            Notifications will be sent automatically to available channels (email and/or SMS).
          </p>
        </DialogContent>
        <DialogActions className="calendar-dialog-actions calendar-dialog-actions--compact">
          <>
            <Button
              onClick={handleCancelConfirmClose}
              color="default"
              disabled={canceling}
              className="calendar-dialog-button"
            >
              Keep order
            </Button>
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
              onClick={handleCancelAndNotify}
              color="secondary"
              variant="contained"
              disabled={canceling}
              className="calendar-dialog-button calendar-dialog-button--danger-fill"
            >
              {canceling ? 'Canceling...' : 'Cancel & notify'}
            </Button>
          </>
        </DialogActions>
      </Dialog>
    </>
  )
}
