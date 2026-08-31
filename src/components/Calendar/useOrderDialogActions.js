import { useState } from 'react'
import { enqueueSnackbar } from 'notistack'
import { useQueryClient } from '@tanstack/react-query'

import ordersAPI from '../../services/ordersAPI'
import sendConfirmationEmail, { sendCancellationEmail } from '../../services/emailAPI'
import sendSMS, { sendCancellationSMS } from '../../services/smsAPI'
import { hydrateCanonicalOrder, updateOrderField } from '../../shared/orderModel'
import { toCommunicationOrder, toUpdateOrderPayload } from '../../shared/orderSerialization'
import { isCanceled, isDeleted } from '../../shared/orderState.helpers'

const CALENDAR_ORDERS_QUERY_KEY = ['calendar-orders']

/**
 * Server actions used by the calendar order dialog.
 *
 * Keeping these actions together makes the component responsible for rendering
 * the dialog while this hook owns the request/loading/update choreography.
 */
export default function useOrderDialogActions({
  order,
  orderId,
  setOrder,
  onOrderUpdate,
  onClose,
}) {
  const queryClient = useQueryClient()
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

  const invalidateCalendarOrders = () =>
    queryClient.invalidateQueries({ queryKey: CALENDAR_ORDERS_QUERY_KEY })

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
      const communicationOrder = toCommunicationOrder(order)
      const response = isCanceled(order)
        ? await sendCancellationEmail({ order: communicationOrder, email: order.email })
        : await sendConfirmationEmail({ order: communicationOrder, email: order.email })

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
      const communicationOrder = toCommunicationOrder(order)
      const response = isCanceled(order)
        ? await sendCancellationSMS({ order: communicationOrder })
        : await sendSMS({ order: communicationOrder })

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
      const updatedOrder = hydrateCanonicalOrder(response.order || response)
      setOrder(updatedOrder)
      onOrderUpdate?.(updatedOrder)
    } catch (err) {
      enqueueSnackbar('Failed to confirm order. Please try again.', { variant: 'error' })
    } finally {
      setConfirmDialogOpen(false)
    }
  }

  const handleEdit = () => {
    if (!order) return

    setEditableOrder(hydrateCanonicalOrder(order))
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
      const response = await ordersAPI.update(orderId, toUpdateOrderPayload(editableOrder))
      setOrder(hydrateCanonicalOrder(response.order || response))
      enqueueSnackbar(response.message || 'Order changes saved.')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
      setEditOpen(false)
      setEditableOrder(null)
      invalidateCalendarOrders()
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
      invalidateCalendarOrders()
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
      const updatedOrder = hydrateCanonicalOrder(response.order || response)
      setOrder(updatedOrder)
      enqueueSnackbar(response.message || 'Order restored')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
      invalidateCalendarOrders()
      onOrderUpdate?.(updatedOrder)
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
    const updatedOrder = hydrateCanonicalOrder(response.order || response)
    setOrder(updatedOrder)
    invalidateCalendarOrders()
    onOrderUpdate?.(updatedOrder)
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
      const communicationOrder = toCommunicationOrder(updatedOrder)
      const notificationRequests = []

      if (updatedOrder?.email) {
        notificationRequests.push(
          sendCancellationEmail({ order: communicationOrder, email: updatedOrder.email })
        )
      }
      if (updatedOrder?.phone) {
        notificationRequests.push(sendCancellationSMS({ order: communicationOrder }))
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

  return {
    cancelConfirmOpen,
    canceling,
    confirmDialogOpen,
    deleting,
    deleteConfirmOpen,
    deleteMode,
    editOpen,
    editableOrder,
    handleCancelAndNotify,
    handleCancelConfirmClose,
    handleCancelConfirmDirect,
    handleCancelConfirmOpen,
    handleConfirm,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteConfirmClose,
    handleEdit,
    handleEditChange,
    handleEditClose,
    handleRestore,
    handleSaveChanges,
    handleSendEmail,
    handleSendSMS,
    savingEdit,
    sendingEmail,
    sendingSMS,
    setEditableOrder,
    setConfirmDialogOpen,
  }
}
