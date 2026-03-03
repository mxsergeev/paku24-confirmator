import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, IconButton } from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import { enqueueSnackbar } from 'notistack'

import '../Confirmator/Confirmator.css'
import './Calendar.css'
import Editor from '../Confirmator/Editor'

import OrderSettings from '../Confirmator/OrderSettings'
import ValidationDisplay from '../Confirmator/ValidationDisplay'
import RawOrderContainer from '../Confirmator/OrderContainers/RawOrderContainer'
import TransformedOrderContainer from '../Confirmator/OrderContainers/TransformedOrderContainer'
import TransformPanel from '../Confirmator/OrderOperations/TransformPanel'
import MainOperationsPanel from '../Confirmator/OrderOperations/MainOperationsPanel'
import Order from '../../shared/Order'

export default function NewOrderDialog({ open, onClose, onOrderCreated }) {
  const isMobile = window.innerWidth <= 600
  const [rawOrder, setRawOrder] = useState({ text: '', id: null })
  const [transformedOrder, setTransformedOrder] = useState({
    text: '',
    id: null,
  })

  const [order, setOrder] = useState(Order.default())

  useEffect(() => {
    const savedOrder = localStorage.getItem('confirmator_order')
    const savedRawOrder = localStorage.getItem('confirmator_rawOrder')
    savedOrder && setOrder(new Order(JSON.parse(savedOrder)))
    savedRawOrder && setRawOrder(JSON.parse(savedRawOrder))
  }, [])

  useEffect(() => {
    localStorage.setItem('confirmator_order', JSON.stringify(order.prepareForSending()))
  }, [order])
  useEffect(() => {
    localStorage.setItem('confirmator_rawOrder', JSON.stringify(rawOrder))
  }, [rawOrder])

  const rawOrderOrderContainerRef = useRef(null)
  const transformedOrderContainerRef = useRef(null)

  const reset = useCallback(() => {
    setRawOrder({ text: '', id: null })
    setTransformedOrder({ text: '', id: null })
    setOrder(Order.default())
  }, [])

  const handleOrderChange = useCallback(
    (key, value) => {
      order[key] = value

      return setOrder(new Order(order))
    },
    [order]
  )

  const handleRawOrderUpdate = useCallback(
    (rawO) => {
      setRawOrder({ ...rawOrder, id: rawO.id || null, text: rawO.text || rawO })
    },
    [rawOrder]
  )

  const handleTransformedOrderUpdate = useCallback((transO) => {
    setTransformedOrder((prev) => ({ ...prev, text: transO }))
  }, [])

  const handleOrderTransformFromText = useCallback(
    (o = rawOrder) => {
      Order.setupOrderFromText(o.text)
        .then((orderFromText) => {
          setOrder(orderFromText)
          return setTransformedOrder({
            id: o.id,
            text: Order.format(orderFromText),
          })
        })
        .catch((err) => enqueueSnackbar(err.message, { variant: 'error' }))
    },
    [rawOrder]
  )

  const handleOrderTransformFromEditor = useCallback(
    () => setTransformedOrder({ id: rawOrder.id, text: Order.format(order) }),
    [rawOrder, order]
  )

  const handleComplete = useCallback(() => {
    onOrderCreated && onOrderCreated()
    reset()
  }, [onOrderCreated, reset])

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
            <RawOrderContainer
              elementRef={rawOrderOrderContainerRef}
              rawOrderText={rawOrder.text}
              handleClick={handleRawOrderUpdate}
            />

            <Editor order={order} handleChange={handleOrderChange} />

            <TransformPanel
              elementRef={transformedOrderContainerRef}
              transformDisabled={!rawOrder.text}
              copyDisabled={!transformedOrder.text}
              handleOrderTransformFromText={handleOrderTransformFromText}
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
              orderId={rawOrder.id}
              transformedOrder={transformedOrder}
              handleResetClick={handleComplete}
              hideOrderPool={true}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
