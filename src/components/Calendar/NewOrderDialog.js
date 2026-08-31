import React, { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, IconButton } from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import { useQueryClient } from '@tanstack/react-query'

import '../Confirmator/Confirmator.css'
import './Calendar.css'
import Editor from '../Confirmator/Editor'

import OrderSettings from '../Confirmator/OrderSettings'
import ValidationDisplay from '../Confirmator/ValidationDisplay'
import TransformedOrderContainer from '../Confirmator/OrderContainers/TransformedOrderContainer'
import TransformPanel from '../Confirmator/OrderOperations/TransformPanel'
import MainOperationsPanel from '../Confirmator/OrderOperations/MainOperationsPanel'
import {
  createAppOrder,
  updateOrderField,
} from '../../shared/orderModel'
import { readOrderDraft, useOrderDraft } from '../../hooks/useOrderDraft'
import { formatOrder } from '../../shared/render/text'

const NEW_ORDER_DRAFT_STORAGE_KEY = 'new_order'

export default function NewOrderDialog({ open, onClose, onOrderCreated }) {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width:600px)')
  const [transformedOrder, setTransformedOrder] = useState({
    text: '',
    id: null,
  })

  const [order, setOrder] = useState(
    () => readOrderDraft(NEW_ORDER_DRAFT_STORAGE_KEY) || createAppOrder()
  )
  const { clearDraft, skipNextPersistence } = useOrderDraft(NEW_ORDER_DRAFT_STORAGE_KEY, {
    value: order,
  })

  const transformedOrderContainerRef = useRef(null)

  const reset = useCallback(() => {
    clearDraft()
    skipNextPersistence()
    setTransformedOrder({ text: '', id: null })
    setOrder(createAppOrder())
  }, [clearDraft, skipNextPersistence])

  const handleOrderChange = useCallback(
    (key, value) => setOrder((previous) => updateOrderField(previous, key, value)),
    []
  )

  const handleTransformedOrderUpdate = useCallback((transO) => {
    setTransformedOrder((prev) => ({ ...prev, text: transO }))
  }, [])

  const handleOrderPersisted = useCallback((id) => {
    setOrder((previous) => (previous ? { ...previous, id } : previous))
  }, [])

  const handleOrderTransformFromEditor = useCallback(
    () => setTransformedOrder({ id: null, text: formatOrder(order) }),
    [order]
  )

  const handleComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
    onOrderCreated && onOrderCreated()
    reset()
  }, [queryClient, onOrderCreated, reset])

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

            <TransformPanel
              elementRef={transformedOrderContainerRef}
              copyDisabled={!transformedOrder.text}
              onClear={reset}
              handleOrderTransformFromEditor={handleOrderTransformFromEditor}
            />

            <TransformedOrderContainer
              elementRef={transformedOrderContainerRef}
              transformedOrderText={transformedOrder.text}
              handleClick={handleTransformedOrderUpdate}
            />

            <OrderSettings handleChange={handleOrderChange} order={order} />
            <ValidationDisplay order={order} shouldValidate={transformedOrder.text} />
            <MainOperationsPanel
              order={order}
              orderId={null}
              transformedOrder={transformedOrder}
              handleResetClick={handleComplete}
              hideOrderPool={true}
              onOrderPersisted={handleOrderPersisted}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
