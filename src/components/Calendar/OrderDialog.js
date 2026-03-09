import React, { useEffect, useState, useCallback } from 'react'
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
import iconsData from '../../data/icons.json'

export default function OrderDialog({ open, onClose, orderId }) {
  const queryClient = useQueryClient()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [eventType, setEventType] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editableOrder, setEditableOrder] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    if (!orderId || !order) return
    setEditableOrder(new Order(order))
    setEditOpen(true)
  }, [orderId, order])

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
    const { orderId: realOrderId } = parseBoxEventId(orderId)

    try {
      setSavingEdit(true)
      const updateData = new Order(editableOrder).prepareForSending()
      const response = await orderPoolAPI.update(realOrderId, updateData)
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
  }, [orderId, editableOrder, queryClient])

  const handleDeleteClick = useCallback(() => {
    setDeleteConfirmOpen(true)
  }, [])

  const handleDeleteConfirmClose = useCallback(() => {
    setDeleteConfirmOpen(false)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!orderId) return
    const { orderId: realOrderId } = parseBoxEventId(orderId)

    try {
      setDeleting(true)
      const response = await orderPoolAPI.remove(realOrderId)
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
  }, [orderId, onClose, queryClient])

  useEffect(() => {
    if (!open || !orderId) return
    setLoading(true)
    setError(null)
    setOrder(null)
    let isMounted = true

    const { orderId: realOrderId, eventType: parsedEventType } = parseBoxEventId(orderId)
    setEventType(parsedEventType)

    const fetchOrder = async () => {
      try {
        const data = await orderPoolAPI.getOrderById(realOrderId)
        if (!isMounted) return
        setOrder(data.order || data)
        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Error')
        setLoading(false)
      }
    }

    fetchOrder()

    return () => {
      isMounted = false
    }
  }, [open, orderId])

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth={window.innerWidth > 600}
        maxWidth={window.innerWidth > 600 ? 'sm' : false}
        PaperProps={
          window.innerWidth > 600
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
          <h3 className="calendar-dialog-title">
            {order ? (
              eventType === 'boxDelivery' ? (
                getBoxEventTitle(
                  order,
                  'boxDelivery',
                  order.boxes?.deliveryDate ? dayjs(order.boxes.deliveryDate).format('HH:mm') : '',
                  iconsData
                )
              ) : eventType === 'boxReturn' ? (
                getBoxEventTitle(
                  order,
                  'boxReturn',
                  order.boxes?.returnDate ? dayjs(order.boxes.returnDate).format('HH:mm') : '',
                  iconsData
                )
              ) : (
                <>
                  {getOrderIcons(order, iconsData)}{' '}
                  {order.date ? dayjs(order.date).format('HH:mm') : ''}({order.duration}h){' '}
                  {order.name}
                </>
              )
            ) : loading ? (
              'Loading...'
            ) : error ? (
              'Error'
            ) : (
              ''
            )}
          </h3>
          <IconButton
            aria-label="close"
            onClick={onClose}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <OrderDialogDetails loading={loading} error={error} order={order} eventType={eventType} />
        </DialogContent>
        <DialogActions className="calendar-dialog-actions">
          <div className="calendar-dialog-actions-group">
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={handleSendEmail}
              disabled={!order || !order.email || loading || sendingEmail}
              className="calendar-dialog-button"
            >
              Email
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<TextsmsIcon />}
              onClick={handleSendSMS}
              disabled={!order || !order.phone || loading || sendingSMS}
              className="calendar-dialog-button"
            >
              SMS
            </Button>
          </div>
          <Button
            variant="outlined"
            color="default"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            disabled={!order || loading}
            className="calendar-dialog-button"
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            disabled={!order || loading}
            className="calendar-dialog-button"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        fullWidth
        maxWidth="md"
        PaperProps={{ style: { borderRadius: 16 } }}
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
            variant="outlined"
            color="default"
            onClick={handleEditClose}
            className="calendar-dialog-button"
            disabled={savingEdit}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveChanges}
            className="calendar-dialog-button"
            disabled={!editableOrder || savingEdit}
          >
            Save changes
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
