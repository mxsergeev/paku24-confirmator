import React, { useState, useRef } from 'react'
import Toast from 'light-toast'

import './Confirmator.css'
import Editor from './Editor'

import OrderSettings from './OrderSettings'
import ValidationDisplay from './ValidationDisplay'
import RawOrderContainer from './OrderContainers/RawOrderContainer'
import TransformedOrderContainer from './OrderContainers/TransformedOrderContainer'
import TransformPanel from './OrderOperations/TransformPanel'
import MainOperationsPanel from './OrderOperations/MainOperationsPanel'
import OrderPoolDialog from './OrderPool/OrderPoolDialog'

import Order from '../../helpers/Order'

export default function Confirmator() {
  const [rawOrder, setRawOrder] = useState({ text: '', id: null })
  const [transformedOrder, setTransformedOrder] = useState({
    text: '',
    id: null,
  })

  const [order, setOrder] = useState(Order.default())

  function transform(o) {
    return Order.transformToText(o, (msg) => Toast.info(msg, 500))
  }

  const rawOrderOrderContainerRef = useRef(null)
  const transformedOrderContainerRef = useRef(null)

  function reset() {
    setRawOrder({ text: '', id: null })
    setTransformedOrder({ text: '', id: null })
    setOrder(Order.default())
  }

  function handleOrderChange(e) {
    const changedOrder = new Order({
      ...order,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    })
    return setOrder(changedOrder)
  }

  function handleRawOrderUpdate(rawO) {
    // Raw order has an id and is an object if it is exported from DB otherwise it's a plain string
    setRawOrder({ ...rawOrder, id: rawO.id || null, text: rawO.text || rawO })
  }
  function handleTransformedOrderUpdate(transO) {
    setTransformedOrder({ ...transformedOrder, text: transO })
  }

  function handleOrderTransformFromText(o = rawOrder) {
    Order.setupOrderFromText(o.text)
      .then((orderFromText) => {
        setOrder(orderFromText)
        return setTransformedOrder({
          id: o.id,
          text: transform(orderFromText),
        })
      })
      .catch((err) => Toast.fail(err.message, 400))
  }

  function handleOrderTransformFromEditor() {
    return setTransformedOrder({ id: rawOrder.id, text: transform(order) })
  }

  function handleOrderPoolExport(o) {
    handleRawOrderUpdate(o)
    handleOrderTransformFromText(o)
    setTimeout(
      () => rawOrderOrderContainerRef.current.scrollIntoView({ smooth: true }),
      700
    )
  }

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
      />
      <OrderPoolDialog handleExport={handleOrderPoolExport} />
    </div>
  )
}