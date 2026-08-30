import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { enqueueSnackbar } from 'notistack'

import './Confirmator.css'
import Editor from './Editor'

import OrderSettings from './OrderSettings'
import ValidationDisplay from './ValidationDisplay'
import TransformedOrderContainer from './OrderContainers/TransformedOrderContainer'
import TransformPanel from './OrderOperations/TransformPanel'
import MainOperationsPanel from './OrderOperations/MainOperationsPanel'
import OrderPoolDialog from './OrderPool/OrderPoolDialog'
import orderPoolAPI from '../../services/orderPoolAPI'
import {
  createAppOrder,
  hydrateCanonicalOrder,
  revertToInitial,
  updateOrderField,
} from '../../shared/orderModel'
import { readOrderDraft, useOrderDraft } from '../../hooks/useOrderDraft'
import { formatOrder } from '../../shared/render/text'
import { isObjectId } from '../../shared/validators'

const CONFIRMATOR_DRAFT_STORAGE_KEY = 'confirmator_order'

export default function Confirmator() {
  const params = useParams()
  const hasExplicitOrderId = Boolean(params.id && isObjectId(params.id))

  const [transformedOrder, setTransformedOrder] = useState({
    text: '',
    id: null,
  })

  const [order, setOrder] = useState(() =>
    hasExplicitOrderId
      ? createAppOrder()
      : readOrderDraft(CONFIRMATOR_DRAFT_STORAGE_KEY) || createAppOrder()
  )
  const [reverting, setReverting] = useState(false)

  const routeIdRef = useRef(params.id)
  const routeChanged = routeIdRef.current !== params.id
  const { readDraft, clearDraft, skipNextPersistence } = useOrderDraft(CONFIRMATOR_DRAFT_STORAGE_KEY, {
    value: order,
    enabled: !hasExplicitOrderId,
    skipPersistence: !hasExplicitOrderId && routeChanged,
  })

  useEffect(() => {
    let active = true
    const routeChanged = routeIdRef.current !== params.id
    routeIdRef.current = params.id

    if (!hasExplicitOrderId) {
      // The initial no-id render is hydrated lazily in useState. Hydrate again
      // only when the route changes while this component remains mounted.
      if (routeChanged) {
        setOrder(readDraft() || createAppOrder())
      }
      return () => {
        active = false
      }
    }

    const fetchOrder = async () => {
      try {
        const { order: responseOrder } = await orderPoolAPI.getOrderById(params.id)

        if (!active || !responseOrder) return

        const normalizedOrder = hydrateCanonicalOrder(responseOrder)
        setOrder(normalizedOrder)
      } catch {
        // Keep the fresh app state when the requested order cannot be loaded.
      }
    }

    fetchOrder()

    return () => {
      active = false
    }
  }, [hasExplicitOrderId, params.id, readDraft, routeChanged, skipNextPersistence])

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

  const handleRevert = useCallback(async () => {
    if (!order) return

    const orderId = order.id || order._id

    try {
      setReverting(true)
      if (orderId) {
        const response = await orderPoolAPI.revert(orderId)
        const updatedOrder = hydrateCanonicalOrder(response.order || response)
        setOrder(updatedOrder)
        enqueueSnackbar(response.message || 'Order reverted.')
      } else {
        setOrder((previous) => revertToInitial(previous))
      }
    } catch (err) {
      if (err.message === 'logout') return
      enqueueSnackbar(err.response?.data?.error || err.message || 'Could not revert order.', {
        variant: 'error',
      })
    } finally {
      setReverting(false)
    }
  }, [order])

  const handleTransformedOrderUpdate = useCallback((transO) => {
    setTransformedOrder((prev) => ({ ...prev, text: transO }))
  }, [])

  const handleOrderTransformFromEditor = useCallback(
    () => setTransformedOrder({ id: order?.id || order?._id || null, text: formatOrder(order) }),
    [order]
  )

  const handleOrderPoolExport = useCallback(
    (o) => {
      const ord = hydrateCanonicalOrder(o)
      const orderId = ord.id || ord._id || o.id || o._id || null

      setOrder(ord)
      setTransformedOrder({
        id: orderId,
        text: formatOrder(ord),
      })
    },
    []
  )

  return (
    <div className="flex-container">
      <Editor
        order={order}
        handleChange={handleOrderChange}
        onOrderChange={setOrder}
        onRevert={handleRevert}
        reverting={reverting}
      />

      <TransformPanel
        elementRef={transformedOrderContainerRef}
        copyDisabled={!transformedOrder.text}
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
        orderId={order?.id || order?._id || null}
        transformedOrder={transformedOrder}
        handleResetClick={reset}
        orderPoolUrl="/confirmator/order-pool"
      />
      <OrderPoolDialog path="/confirmator/order-pool" handleExport={handleOrderPoolExport} />
    </div>
  )
}
