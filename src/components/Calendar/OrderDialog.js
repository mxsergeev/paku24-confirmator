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
import { enqueueSnackbar } from 'notistack'
import dayjs from 'dayjs'
import './Calendar.css'
import { getOrderIcons, parseBoxEventId, getBoxEventTitle } from './orderIcons'
import orderPoolAPI from '../../services/orderPoolAPI'
import sendConfirmationEmail from '../../services/emailAPI'
import sendSMS from '../../services/smsAPI'
import Order from '../../shared/Order'
import Editor from '../Confirmator/Editor'

export default function OrderDialog({ open, onClose, orderId, iconsData }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [eventType, setEventType] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editableOrder, setEditableOrder] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

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
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Save failed.', { variant: 'error' })
    } finally {
      setSavingEdit(false)
    }
  }, [orderId, editableOrder])

  useEffect(() => {
    if (!open || !orderId) return
    setLoading(true)
    setError(null)
    setOrder(null)
    let isMounted = true

    const { orderId: realOrderId, eventType: parsedEventType } = parseBoxEventId(orderId)
    setEventType(parsedEventType)

    orderPoolAPI
      .getOrderById(realOrderId)
      .then((data) => {
        if (!isMounted) return
        setOrder(data.order || data)
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Error')
        setLoading(false)
      })

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
          {loading && <div>Loading...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {order &&
            !loading &&
            !error &&
            (eventType === 'boxDelivery' || eventType === 'boxReturn') && (
              <>
                <p>
                  <strong>Address:</strong> {order.address?.street}, {order.address?.index}{' '}
                  {order.address?.city}
                </p>
                {order.boxes && (
                  <>
                    <p>
                      <strong>Date:</strong>{' '}
                      {eventType === 'boxDelivery'
                        ? dayjs(order.boxes.deliveryDate).format('DD.MM.YYYY HH:mm')
                        : dayjs(order.boxes.returnDate).format('DD.MM.YYYY HH:mm')}
                    </p>
                    <p>
                      <strong>Boxes:</strong> {order.boxes.amount} kpl
                    </p>
                    <p>
                      <strong>Price:</strong>{' '}
                      {eventType === 'boxDelivery'
                        ? order.boxes.deliveryPrice || 0
                        : order.boxes.returnPrice || 0}
                      €
                    </p>
                  </>
                )}
                {order.phone && order.phone.replace(/0/g, '') !== '' && (
                  <p>
                    <strong>Client number:</strong> {order.phone}
                  </p>
                )}
              </>
            )}
          {order && !loading && !error && !eventType && (
            <>
              <p>
                <strong>From:</strong> {order.address?.street}, {order.address?.index}{' '}
                {order.address?.city}
              </p>
              {order.extraAddress && (
                <p>
                  <strong>Extra Address:</strong> {order.extraAddress}
                </p>
              )}
              {order.destination && order.destination.street && (
                <p>
                  <strong>To:</strong> {order.destination.street}, {order.destination.index}{' '}
                  {order.destination.city}
                </p>
              )}
              <p>
                <strong>Payment Type:</strong> {order.paymentType?.name || ''}
              </p>
              <p>
                <strong>Total Price:</strong> {order.price || 0}€
              </p>
              {order.fees && Array.isArray(order.fees) && order.fees.length > 0 && (
                <div>
                  <strong>Fees:</strong>
                  <ul className="calendar-fee-list">
                    {order.fees.map((fee, index) => (
                      <li key={index} className="calendar-fee-item">
                        {fee.name}: {fee.amount}€
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {order.boxes && (
                <p>
                  <strong>Boxes:</strong> {order.boxes.amount} kpl, {order.boxesPrice}€
                </p>
              )}
              <p>
                <strong>Service:</strong> {order.service?.name || ''}
              </p>
              {order.phone && order.phone.replace(/0/g, '') !== '' && (
                <p>
                  <strong>Client number:</strong> {order.phone}
                </p>
              )}
            </>
          )}
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
    </>
  )
}
