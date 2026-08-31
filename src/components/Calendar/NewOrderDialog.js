import React, { useState } from 'react'
import { Button, Dialog, DialogContent, DialogTitle, IconButton } from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import NoteAddIcon from '@material-ui/icons/NoteAdd'
import { useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'

import './Calendar.css'
import Editor from '../Confirmator/Editor'

import OrderSettings from '../Confirmator/OrderSettings'
import ValidationDisplay from '../Confirmator/ValidationDisplay'
import {
  createAppOrder,
  updateOrderField,
} from '../../shared/orderModel'
import { readOrderDraft, useOrderDraft } from '../../hooks/useOrderDraft'
import orderPoolAPI from '../../services/orderPoolAPI'
import { toCreateOrderPayload } from '../../shared/orderSerialization'

const NEW_ORDER_DRAFT_STORAGE_KEY = 'new_order'
const PENDING_NEW_ORDER_ID_STORAGE_KEY = 'pending_new_order_id'

function readPendingOrderId() {
  try {
    return window.localStorage.getItem(PENDING_NEW_ORDER_ID_STORAGE_KEY)
  } catch {
    return null
  }
}

function savePendingOrderId(id) {
  try {
    window.localStorage.setItem(PENDING_NEW_ORDER_ID_STORAGE_KEY, id)
  } catch {
    // A pending ID is only reload recovery; the in-memory order remains usable.
  }
}

function clearPendingOrderId() {
  try {
    window.localStorage.removeItem(PENDING_NEW_ORDER_ID_STORAGE_KEY)
  } catch {
    // Best effort cleanup when browser storage is unavailable.
  }
}

export default function NewOrderDialog({ open, onClose, onOrderCreated }) {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width:600px)')
  const [order, setOrder] = useState(
    () => {
      const draft = readOrderDraft(NEW_ORDER_DRAFT_STORAGE_KEY) || createAppOrder()
      const pendingId = readPendingOrderId()
      return pendingId ? { ...draft, id: pendingId } : draft
    },
  )
  const [addStatus, setAddStatus] = useState(null)
  const { saveDraft, clearDraft } = useOrderDraft(NEW_ORDER_DRAFT_STORAGE_KEY, {
    value: order,
    enabled: !order?.id,
  })

  function reset() {
    clearDraft()
    clearPendingOrderId()
    setAddStatus(null)
    setOrder(createAppOrder())
  }

  function handleOrderChange(key, value) {
    setOrder((previous) => updateOrderField(previous, key, value))
  }

  function handleOrderPersisted(id) {
    clearDraft()
    savePendingOrderId(id)
    setOrder((previous) => (previous ? { ...previous, id } : previous))
  }

  function handleComplete() {
    queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
    onOrderCreated && onOrderCreated()
    reset()
  }

  async function handleAddOrder() {
    if (addStatus === 'Working' || order?.deletedAt) return

    try {
      setAddStatus('Working')
      let id = order?.id
      if (!id) {
        saveDraft(order)
        const response = await orderPoolAPI.add({ order: toCreateOrderPayload(order) })
        id = response?.id
        if (!id) throw new Error('Order was added but no ID was returned')
        handleOrderPersisted(id)
      }

      const response = await orderPoolAPI.confirm(id)
      clearPendingOrderId()
      setAddStatus('Done')
      if (response?.message) enqueueSnackbar(response.message)
      handleComplete()
    } catch (err) {
      if (err.message === 'logout') return
      setAddStatus('Error')
      enqueueSnackbar(err.response?.data?.error || err.message || String(err), { variant: 'error' })
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="body"
      fullWidth={false}
      maxWidth={false}
      PaperProps={{
        className: 'calendar-new-order-dialog-paper',
        style: isMobile
          ? {
              width: '100vw',
              maxWidth: '100vw',
              margin: 0,
              borderRadius: 0,
            }
          : undefined,
      }}
    >
      <DialogTitle className="calendar-new-order-dialog-title">
        <h3 className="calendar-new-order-dialog-title-text">New Order</h3>
        <IconButton
          aria-label="close"
          onClick={onClose}
          className="calendar-new-order-dialog-close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="calendar-new-order-dialog-content">
        <div className="calendar-new-order-dialog-content-wrap">
          <div className="flex-container calendar-new-order-flex-container">
            <Editor order={order} handleChange={handleOrderChange} onOrderChange={setOrder} />

            <OrderSettings handleChange={handleOrderChange} order={order} />
            <ValidationDisplay order={order} />
            <div className="order-operations">
              <div className="block">
                <Button
                  className="share-space"
                  variant="contained"
                  size="small"
                  onClick={handleAddOrder}
                  disabled={addStatus === 'Working' || Boolean(order?.deletedAt)}
                >
                  {addStatus || 'Add order'} <NoteAddIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
