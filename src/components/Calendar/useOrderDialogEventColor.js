import { useCallback, useEffect, useRef } from 'react'
import { enqueueSnackbar } from 'notistack'
import { useQueryClient } from '@tanstack/react-query'

import ordersAPI from '../../services/ordersAPI'

export const CALENDAR_ORDERS_QUERY_KEY = ['calendar-orders']

export function updateCalendarOrdersColor(orders, orderId, eventColor) {
  if (!Array.isArray(orders) || eventColor === undefined) return orders

  const targetId = String(orderId)
  let changed = false
  const updatedOrders = orders.map((cachedOrder) => {
    if (String(cachedOrder?.id) !== targetId) return cachedOrder

    changed = true
    return { ...cachedOrder, eventColor }
  })

  return changed ? updatedOrders : orders
}

export function updateCalendarOrdersCache(queryClient, orderId, eventColor) {
  if (eventColor === undefined) return

  queryClient.getQueriesData({ queryKey: CALENDAR_ORDERS_QUERY_KEY }).forEach(([queryKey, data]) => {
    const updatedOrders = updateCalendarOrdersColor(data, orderId, eventColor)
    if (updatedOrders !== data) {
      queryClient.setQueryData(queryKey, updatedOrders)
    }
  })
}

export default function useOrderDialogEventColor({
  order,
  orderId,
  setOrder,
}) {
  const queryClient = useQueryClient()
  const debounceTimerRef = useRef(null)
  const activeOrderIdRef = useRef(orderId)
  activeOrderIdRef.current = orderId
  const colorUpdateRef = useRef({
    orderId,
    queue: Promise.resolve(),
    pending: 0,
    committedColor: null,
    latestColor: null,
  })

  const handleEventColorChange = useCallback(
    (eventColor) => {
      if (
        !orderId ||
        !order ||
        activeOrderIdRef.current !== orderId ||
        colorUpdateRef.current.orderId !== orderId
      ) {
        return
      }

      if (typeof eventColor !== 'string' || eventColor.trim() === '') {
        enqueueSnackbar('Invalid event color provided.', { variant: 'error' })
        return
      }

      const colorUpdate = colorUpdateRef.current
      if (colorUpdate.pending === 0) colorUpdate.committedColor = order.eventColor ?? null
      colorUpdate.pending += 1
      colorUpdate.latestColor = eventColor

      setOrder((currentOrder) =>
        currentOrder ? { ...currentOrder, eventColor } : currentOrder,
      )
      updateCalendarOrdersCache(queryClient, orderId, eventColor)

      // Serialize color writes so a failed later update cannot hide an earlier
      // update that was already persisted.
      const queuedUpdate = colorUpdate.queue
        .catch(() => {})
        .then(async () => {
          try {
            const response = await ordersAPI.updateColor(orderId, eventColor)
            const savedEventColor =
              response?.order?.eventColor ?? response?.eventColor ?? eventColor
            colorUpdate.committedColor = savedEventColor
            if (
              activeOrderIdRef.current !== orderId ||
              colorUpdateRef.current !== colorUpdate
            ) {
              return
            }

            if (colorUpdate.latestColor !== eventColor) return

            setOrder((currentOrder) =>
              currentOrder ? { ...currentOrder, eventColor: savedEventColor } : currentOrder,
            )
            updateCalendarOrdersCache(queryClient, orderId, colorUpdate.committedColor)
            enqueueSnackbar(response?.message || 'Event color updated.', { variant: 'success' })
            if (response?.warning?.message) {
              enqueueSnackbar(response.warning.message, { variant: 'warning' })
            }
            queryClient.invalidateQueries({ queryKey: CALENDAR_ORDERS_QUERY_KEY })
          } catch (err) {
            if (colorUpdate.latestColor !== eventColor) return

            if (
              activeOrderIdRef.current !== orderId ||
              colorUpdateRef.current !== colorUpdate
            ) {
              updateCalendarOrdersCache(queryClient, orderId, colorUpdate.committedColor)
              return
            }

            setOrder((currentOrder) =>
              currentOrder
                ? { ...currentOrder, eventColor: colorUpdate.committedColor }
                : currentOrder,
            )
            updateCalendarOrdersCache(queryClient, orderId, colorUpdate.committedColor)
            if (err.message === 'logout') return
            enqueueSnackbar(
              err.response?.data?.error || err.message || 'Could not update event color. Please try again.',
              { variant: 'error' }
            )
          } finally {
            colorUpdate.pending -= 1
          }
        })
      colorUpdate.queue = queuedUpdate
    },
    [order, orderId, queryClient, setOrder]
  )

  const debouncedHandleEventColorChange = useCallback(
    (eventColor) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => handleEventColorChange(eventColor), 300)
    },
    [handleEventColorChange]
  )

  useEffect(
    () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      colorUpdateRef.current = {
        orderId,
        queue: Promise.resolve(),
        pending: 0,
        committedColor: null,
        latestColor: null,
      }

      return () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      }
    },
    [orderId]
  )

  return {
    onEventColorChange: debouncedHandleEventColorChange,
  }
}
