import { useCallback, useState } from 'react'
import { enqueueSnackbar } from 'notistack'
import { useQueryClient } from '@tanstack/react-query'

import orderPoolAPI from '../../services/orderPoolAPI'
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
  const [revertingEdit, setRevertingEdit] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState('soft')
  const [deleting, setDeleting] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const invalidateCalendarOrders = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CALENDAR_ORDERS_QUERY_KEY }),
    [queryClient]
  )

  const handleSendEmail = useCallback(async () => {
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
  }, [order])

  const handleSendSMS = useCallback(async () => {
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
  }, [order])

  const handleConfirm = useCallback(async () => {
    if (!order?.id) return

    try {
      const response = await orderPoolAPI.confirm(order.id)
      const updatedOrder = hydrateCanonicalOrder(response.order || response)
      setOrder(updatedOrder)
      onOrderUpdate?.(updatedOrder)
    } catch (err) {
      enqueueSnackbar('Failed to confirm order. Please try again.', { variant: 'error' })
    } finally {
      setConfirmDialogOpen(false)
    }
  }, [onOrderUpdate, order, setOrder])

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
    (key, value) => setEditableOrder((previous) => (previous ? updateOrderField(previous, key, value) : previous)),
    []
  )

  const handleSaveChanges = useCallback(async () => {
    if (!orderId || !editableOrder) return

    try {
      setSavingEdit(true)
      const response = await orderPoolAPI.update(orderId, toUpdateOrderPayload(editableOrder))
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
  }, [editableOrder, invalidateCalendarOrders, orderId, setOrder])

  const handleRevertEdit = useCallback(async () => {
    if (!orderId || !editableOrder) return

    try {
      setRevertingEdit(true)
      const response = await orderPoolAPI.revert(orderId)
      const updatedOrder = hydrateCanonicalOrder(response.order || response)

      setOrder(updatedOrder)
      setEditableOrder(updatedOrder)
      onOrderUpdate?.(updatedOrder)
      invalidateCalendarOrders()
      enqueueSnackbar(response.message || 'Order reverted.')
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || 'Could not revert order. Please try again.', {
        variant: 'error',
      })
    } finally {
      setRevertingEdit(false)
    }
  }, [editableOrder, invalidateCalendarOrders, onOrderUpdate, orderId, setOrder])

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
      const response =
        deleteMode === 'permanent'
          ? await orderPoolAPI.removePermanently(orderId)
          : await orderPoolAPI.remove(orderId)
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
  }, [deleteMode, invalidateCalendarOrders, onClose, orderId])

  const handleRestore = useCallback(async () => {
    if (!orderId) return
    try {
      const response = await orderPoolAPI.restore(orderId)
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
  }, [invalidateCalendarOrders, onOrderUpdate, orderId, setOrder])

  const handleCancelConfirmOpen = useCallback(() => {
    setCancelConfirmOpen(true)
  }, [])

  const handleCancelConfirmClose = useCallback(() => {
    setCancelConfirmOpen(false)
  }, [])

  const cancelAndUpdate = useCallback(
    async (id) => {
      if (!id) throw new Error('missing order id')
      const response = await orderPoolAPI.cancel(id)
      const updatedOrder = hydrateCanonicalOrder(response.order || response)
      setOrder(updatedOrder)
      invalidateCalendarOrders()
      onOrderUpdate?.(updatedOrder)
      return { response, updatedOrder }
    },
    [invalidateCalendarOrders, onOrderUpdate, setOrder]
  )

  const handleCancelConfirmDirect = useCallback(async () => {
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
  }, [cancelAndUpdate, order, orderId])

  const handleCancelAndNotify = useCallback(async () => {
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
  }, [cancelAndUpdate, order, orderId])

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
    handleRevertEdit,
    handleRestore,
    handleSaveChanges,
    handleSendEmail,
    handleSendSMS,
    revertingEdit,
    savingEdit,
    sendingEmail,
    sendingSMS,
    setEditableOrder,
    setConfirmDialogOpen,
  }
}
