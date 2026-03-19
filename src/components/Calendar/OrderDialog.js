import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from '@material-ui/core'
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
import iconsData from '../../data/icons.json'

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
  const { orderId, eventType } = useMemo(() => parseBoxEventId(eventId), [eventId])
  const isDesktop = window.innerWidth > 600

  if (!eventId) {
    return null
  }

  const handleSendEmail = useCallback(async () => {
    if (!order?.email) {
      enqueueSnackbar('Email is missing.', { variant: 'warning' })
      return
    }

    const transformedOrderText = Order.format(new Order(order))

    if (!transformedOrderText) {
      enqueueSnackbar('Order details are missing.', { variant: 'warning' })
      return
    }

    try {
      setSendingEmail(true)
      const response = await sendConfirmationEmail({
        orderDetails: transformedOrderText,
        order,
        email: order.email,
      })
      enqueueSnackbar(response.message || 'Email sent.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Email send failed.', { variant: 'error' })
    } finally {
      setSendingEmail(false)
    }
  }, [order])

  const handleSendSMS = useCallback(async () => {
    if (!order?.phone) {
      enqueueSnackbar('Phone number is missing.', { variant: 'warning' })
      return
    }

    try {
      setSendingSMS(true)
      const response = await sendSMS({ order: new Order(order).prepareForSending() })
      enqueueSnackbar(response.message || 'SMS sent.')
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'SMS send failed.', { variant: 'error' })
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
      enqueueSnackbar(response.message || 'Changes saved.')
      setEditOpen(false)
      setEditableOrder(null)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Save failed.', { variant: 'error' })
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
      enqueueSnackbar(response.message || 'Order deleted.')
      setDeleteConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
      onClose()
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Delete failed.', { variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }, [onClose, orderId, queryClient])

  const handleReceiptOpen = useCallback(() => {
    if (!order) return
    setReceiptDraft(buildReceiptDraftFromOrder(order))
    setReceiptOpen(true)
  }, [order])

  const handleReceiptClose = useCallback(() => {
    setReceiptOpen(false)
  }, [])

  const handleReceiptPageOpen = useCallback(
    (draft) => {
      if (!orderId) {
        enqueueSnackbar('Order id is missing.', { variant: 'warning' })
        return
      }

      if (!draft?.customerEmail) {
        enqueueSnackbar('Email is required for receipt.', { variant: 'warning' })
        return
      }

      setReceiptDraft(draft)
      setReceiptOpen(false)
      history.push(`/calendar/receipt/${orderId}`, {
        fromCalendar: true,
        receiptDraft: draft,
      })
    },
    [history, orderId]
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
    : 'Order not found in current range'

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        fullWidth={isDesktop}
        maxWidth={isDesktop ? 'sm' : false}
        PaperProps={
          isDesktop
            ? { style: { borderRadius: 16 } }
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
        <DialogTitle style={{ position: 'relative', paddingRight: 48 }}>
          <h3 className="calendar-dialog-title">{title}</h3>
          <IconButton
            aria-label="close"
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
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
              className="calendar-dialog-button"
            >
              Email
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<TextsmsIcon />}
              onClick={handleSendSMS}
              disabled={!order || !order.phone || sendingSMS}
              className="calendar-dialog-button"
            >
              SMS
            </Button>
            <Button
              variant="contained"
              style={{ backgroundColor: '#e08141', color: 'white' }}
              onClick={handleReceiptOpen}
              disabled={!order}
              className="calendar-dialog-button"
            >
              Receipt
            </Button>
          </div>
          <Button
            variant="outlined"
            color="default"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            disabled={!order}
            className="calendar-dialog-button"
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            disabled={!order}
            className="calendar-dialog-button"
          >
            Delete
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
        fullWidth
        maxWidth={isDesktop ? 'md' : false}
        PaperProps={
          isDesktop
            ? { style: { borderRadius: 16 } }
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
        <DialogTitle style={{ position: 'relative', paddingRight: 48 }}>
          <h3 className="calendar-dialog-title">Edit order</h3>
          <IconButton
            aria-label="close"
            onClick={handleEditClose}
            style={{ position: 'absolute', top: 8, right: 8 }}
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
        PaperProps={{ style: { borderRadius: 16 } }}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to delete this order?</p>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>
            This order will be marked as deleted but can be restored later.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteConfirmClose} color="default" disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="secondary"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
