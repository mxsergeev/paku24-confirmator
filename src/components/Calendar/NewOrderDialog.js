import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogTitle, IconButton } from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import NoteAddIcon from '@material-ui/icons/NoteAdd'
import { enqueueSnackbar } from 'notistack'

import './Calendar.css'
import OrderEditor from '../OrderEditor/OrderEditor'

import OrderSettings from '../OrderEditor/OrderSettings'
import ValidationDisplay from '../OrderEditor/ValidationDisplay'
import { createAppOrder, updateOrderField } from '../../shared/orderModel'
import ordersAPI from '../../services/ordersAPI'
import { toOrderPayload } from '../../shared/orderSerialization'

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

function readSavedDraft() {
  try {
    const rawDraft = window.localStorage.getItem(NEW_ORDER_DRAFT_STORAGE_KEY)
    if (!rawDraft) return null
    return createAppOrder(JSON.parse(rawDraft))
  } catch {
    try {
      window.localStorage.removeItem(NEW_ORDER_DRAFT_STORAGE_KEY)
    } catch {
      // Best effort cleanup when browser storage is unavailable.
    }
    return null
  }
}

function writeSavedDraft(order) {
  try {
    window.localStorage.setItem(NEW_ORDER_DRAFT_STORAGE_KEY, JSON.stringify(order))
  } catch {
    // A draft is useful recovery, but the in-memory order remains usable.
  }
}

function clearSavedDraft() {
  try {
    window.localStorage.removeItem(NEW_ORDER_DRAFT_STORAGE_KEY)
  } catch {
    // Best effort cleanup when browser storage is unavailable.
  }
}

function isMissingOrderError(err) {
  return err?.response?.status === 404
}

export default function NewOrderDialog({ open, onClose, onOrderCreated }) {
  const isMobile = useMediaQuery('(max-width:600px)')
  const [pendingOrderId] = useState(readPendingOrderId)
  const [order, setOrder] = useState(() => {
    const draft = readSavedDraft() || createAppOrder()
    return pendingOrderId ? { ...draft, id: pendingOrderId } : draft
  })
  const [saving, setSaving] = useState(false)
  const [recovering, setRecovering] = useState(Boolean(pendingOrderId))

  useEffect(() => {
    if (order?.id) return
    writeSavedDraft(order)
  }, [order])

  useEffect(() => {
    if (!pendingOrderId) return undefined

    let active = true
    ordersAPI
      .getById(pendingOrderId)
      .then((response) => {
        if (!active) return
        const recoveredOrder = response?.order || response
        setOrder(recoveredOrder)
        setRecovering(false)
      })
      .catch((err) => {
        if (!active || err.message === 'logout') return
        if (isMissingOrderError(err)) {
          clearPendingOrderId()
          setOrder((previous) => (previous ? { ...previous, id: null } : previous))
          setRecovering(false)
          return
        }
        setRecovering(false)
        enqueueSnackbar(
          err.response?.data?.error || 'Could not recover the pending order. Please try again.',
          { variant: 'error' },
        )
      })

    return () => {
      active = false
    }
  }, [pendingOrderId])

  function handleOrderChange(key, value) {
    if (order?.id) return
    setOrder((previous) => updateOrderField(previous, key, value))
  }

  function handleOrderReplace(nextOrder) {
    if (order?.id) return
    setOrder(nextOrder)
  }

  function handleOrderPersisted(id) {
    savePendingOrderId(id)
    setOrder((previous) => (previous ? { ...previous, id } : previous))
  }

  function handleComplete() {
    setOrder(createAppOrder())
    setRecovering(false)
    onOrderCreated && onOrderCreated()
  }

  async function handleAddOrder() {
    if (saving || recovering || order?.deletedAt) return

    let id = order?.id
    try {
      setSaving(true)
      if (!id) {
        const response = await ordersAPI.add({ order: toOrderPayload(order) })
        id = response?.id
        if (!id) throw new Error('Order was added but no ID was returned')
        handleOrderPersisted(id)
      }

      const response = await ordersAPI.confirm(id)
      clearPendingOrderId()
      clearSavedDraft()
      if (response?.message) enqueueSnackbar(response.message)
      handleComplete()
    } catch (err) {
      if (err.message === 'logout') return
      if (isMissingOrderError(err) && id) {
        clearPendingOrderId()
        setOrder((previous) => (previous ? { ...previous, id: null } : previous))
        enqueueSnackbar('The pending order no longer exists. Please review and add it again.', {
          variant: 'warning',
        })
        return
      }
      enqueueSnackbar(err.response?.data?.error || err.message || String(err), { variant: 'error' })
    } finally {
      setSaving(false)
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
                    saving ||
                    recovering ||
                    Boolean(order?.deletedAt)
                  }
                >
                  {recovering
                    ? 'Recovering order'
                    : saving
                    ? 'Saving...'
                    : order?.id
                    ? 'Retry confirmation'
                    : 'Add order'}{' '}
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
