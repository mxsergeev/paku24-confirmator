import React, { useEffect, useRef, useState } from 'react'
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

const NEW_ORDER_DRAFT_STORAGE_KEY = 'new_order'

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

export default function NewOrderDialog({ open, onClose, onOrderCreated }) {
  const isMobile = useMediaQuery('(max-width:600px)')
  const [order, setOrder] = useState(() => readSavedDraft() || createAppOrder())
  const [saving, setSaving] = useState(false)
  const skipDraftSave = useRef(false)

  useEffect(() => {
    if (skipDraftSave.current) {
      skipDraftSave.current = false
      return
    }
    if (open && !order.id) writeSavedDraft(order)
  }, [open, order])

  function handleOrderChange(key, value) {
    setOrder((previous) => updateOrderField(previous, key, value))
  }

  function handleOrderReplace(nextOrder) {
    setOrder(nextOrder)
  }

  function handleComplete() {
    skipDraftSave.current = true
    clearSavedDraft()
    setOrder(createAppOrder())
    onOrderCreated && onOrderCreated()
  }

  async function handleAddOrder() {
    if (saving) return

    try {
      setSaving(true)
      const response = await ordersAPI.add({ order })
      if (!response?.id) throw new Error('Order was added but no ID was returned')
      if (response.message) enqueueSnackbar(response.message)
      if (response.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }
      handleComplete()
    } catch (err) {
      if (err.message === 'logout') return
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
          ? { width: '100vw', maxWidth: '100vw', margin: 0, borderRadius: 0 }
          : undefined,
      }}
    >
      <DialogTitle className="calendar-new-order-dialog-title">
        <h3 className="calendar-new-order-dialog-title-text">New Order</h3>
        <IconButton aria-label="close" onClick={onClose} className="calendar-new-order-dialog-close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="calendar-new-order-dialog-content">
        <div className="calendar-new-order-dialog-content-wrap">
          <div className="flex-container calendar-new-order-flex-container">
            <OrderEditor order={order} handleChange={handleOrderChange} onOrderChange={handleOrderReplace} />
            <OrderSettings handleChange={handleOrderChange} order={order} />
            <ValidationDisplay order={order} />
            <div className="order-operations">
              <div className="block">
                <Button
                  className="share-space"
                  variant="contained"
                  size="small"
                  onClick={handleAddOrder}
                  disabled={saving || Boolean(order?.deletedAt)}
                >
                  {saving ? 'Saving...' : 'Add order'} <NoteAddIcon />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
