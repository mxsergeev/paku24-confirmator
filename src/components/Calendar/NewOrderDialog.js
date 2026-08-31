import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogTitle, IconButton } from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import NoteAddIcon from '@material-ui/icons/NoteAdd'
import { useQueryClient } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'

import './Calendar.css'
import OrderEditor from '../OrderEditor/OrderEditor'

import OrderSettings from '../OrderEditor/OrderSettings'
import ValidationDisplay from '../OrderEditor/ValidationDisplay'
import {
  createAppOrder,
  hydrateCanonicalOrder,
  updateOrderField,
} from '../../shared/orderModel'
import { readOrderDraft, useOrderDraft } from '../../hooks/useOrderDraft'
import ordersAPI from '../../services/ordersAPI'
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
  const [pendingOrderId] = useState(readPendingOrderId)
  const [order, setOrder] = useState(
    () => {
      const draft = readOrderDraft(NEW_ORDER_DRAFT_STORAGE_KEY) || createAppOrder()
      return pendingOrderId ? { ...draft, id: pendingOrderId } : draft
    },
  )
  const [addStatus, setAddStatus] = useState(null)
  const [pendingRecoveryStatus, setPendingRecoveryStatus] = useState(
    pendingOrderId ? 'Working' : null,
  )
  const { saveDraft, clearDraft } = useOrderDraft(NEW_ORDER_DRAFT_STORAGE_KEY, {
    value: order,
    enabled: !order?.id,
  })

  useEffect(() => {
    if (!pendingOrderId) return undefined

    let active = true
    ordersAPI
      .getById(pendingOrderId)
      .then((response) => {
        if (!active) return
        const recoveredOrder = hydrateCanonicalOrder(response?.order || response)
        setOrder(recoveredOrder)
        setPendingRecoveryStatus(null)
      })
      .catch((err) => {
        if (!active || err.message === 'logout') return
        setPendingRecoveryStatus('Error')
        enqueueSnackbar(
          err.response?.data?.error || 'Could not recover the pending order. Please try again.',
          { variant: 'error' },
        )
      })

    return () => {
      active = false
    }
  }, [pendingOrderId])

  function reset() {
    clearDraft({ suppressNextWrite: true })
    clearPendingOrderId()
    setAddStatus(null)
    setPendingRecoveryStatus(null)
    setOrder(createAppOrder())
  }

  function handleOrderChange(key, value) {
    if (order?.id) return
    setOrder((previous) => updateOrderField(previous, key, value))
  }

  function handleOrderReplace(nextOrder) {
    if (order?.id) return
    setOrder(nextOrder)
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
    if (
      addStatus === 'Working' ||
      pendingRecoveryStatus === 'Working' ||
      order?.deletedAt
    ) return

    try {
      setAddStatus('Working')
      let id = order?.id
      if (!id) {
        saveDraft(order)
        const response = await ordersAPI.add({ order: toCreateOrderPayload(order) })
        id = response?.id
        if (!id) throw new Error('Order was added but no ID was returned')
        handleOrderPersisted(id)
      }

      const response = await ordersAPI.confirm(id)
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
            <OrderEditor
              order={order}
              handleChange={handleOrderChange}
              onOrderChange={handleOrderReplace}
            />

            <OrderSettings handleChange={handleOrderChange} order={order} />
            <ValidationDisplay order={order} />
            <div className="order-operations">
              <div className="block">
                <Button
                  className="share-space"
                  variant="contained"
                  size="small"
                  onClick={handleAddOrder}
                  disabled={
                    addStatus === 'Working' ||
                    pendingRecoveryStatus === 'Working' ||
                    Boolean(order?.deletedAt)
                  }
                >
                  {pendingRecoveryStatus === 'Working'
                    ? 'Recovering order'
                    : addStatus || (order?.id ? 'Retry confirmation' : 'Add order')}{' '}
                  <NoteAddIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
