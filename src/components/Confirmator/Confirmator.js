import React, { useState, useRef, useEffect, useCallback } from 'react'
import { enqueueSnackbar } from 'notistack'
import { Route } from 'react-router-dom'

import './Confirmator.css'
import Editor from './Editor'

import OrderSettings from './OrderSettings'
import ValidationDisplay from './ValidationDisplay'
import RawOrderContainer from './OrderContainers/RawOrderContainer'
import TransformedOrderContainer from './OrderContainers/TransformedOrderContainer'
import TransformPanel from './OrderOperations/TransformPanel'
import MainOperationsPanel from './OrderOperations/MainOperationsPanel'
import OrderPoolDialog from './OrderPool/OrderPoolDialog'

import Order from '../../shared/Order'

export default function Confirmator() {
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
      // It's not very good to mutate the state directly but setters won't work otherwise
      order[key] = value

      return setOrder(new Order(order))
    },
    [order]
  )

  const handleRawOrderUpdate = useCallback(
    (rawO) => {
      // Raw order has an id and is an object if it is exported from DB otherwise it's a plain string
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
            text: orderFromText.format(),
          })
        })
        .catch((err) => enqueueSnackbar(err.message, { variant: 'error' }))
    },
    [rawOrder]
  )

  const handleOrderTransformFromEditor = useCallback(
    () => setTransformedOrder({ id: rawOrder.id, text: order.format() }),
    [rawOrder, order]
  )

  const handleOrderPoolExport = useCallback(
    (o) => {
      const ord = new Order(o)

      setOrder(ord)
      setTransformedOrder({
        id: o.id,
        text: ord.format(),
      })
      setTimeout(() => rawOrderOrderContainerRef.current.scrollIntoView({ smooth: true }), 700)
    },
    [rawOrderOrderContainerRef]
  )

  return (
    <div className="flex-container">
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
        handleResetClick={reset}
        orderPoolUrl="/confirmator/order-pool"
      />
      <Route path="/confirmator/order-pool">
        <OrderPoolDialog handleExport={handleOrderPoolExport} />
      </Route>
    </div>
  )
}
