import { useCallback, useEffect, useRef } from 'react'
import { enqueueSnackbar } from 'notistack'
import { useQueryClient } from '@tanstack/react-query'

import orderPoolAPI from '../../services/orderPoolAPI'
import { hydrateCanonicalOrder, updateOrderField } from '../../shared/orderModel'

export const CALENDAR_ORDERS_QUERY_KEY = ['calendar-orders']

export function updateCalendarOrdersColor(orders, orderId, eventColor) {
  if (!Array.isArray(orders) || !eventColor) return orders

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
  if (!eventColor) return

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

  const handleEventColorChange = useCallback(
    async (eventColor) => {
      if (!orderId || !order) return

      const previousOrder = hydrateCanonicalOrder(order)
      const previousCalendarOrdersCache = queryClient.getQueriesData({
        queryKey: CALENDAR_ORDERS_QUERY_KEY,
      })

      try {
        if (!eventColor || typeof eventColor !== 'string') {
          throw new Error('Invalid event color provided.')
        }

        const nextOrder = updateOrderField(order, 'eventColor', eventColor)
        setOrder(nextOrder)
        updateCalendarOrdersCache(queryClient, orderId, eventColor)

        const response = await orderPoolAPI.updateColor(orderId, eventColor)
        const resolvedOrder = hydrateCanonicalOrder(response?.order || response || nextOrder)

        setOrder(resolvedOrder)
        updateCalendarOrdersCache(queryClient, orderId, resolvedOrder?.eventColor ?? null)
        enqueueSnackbar(response?.message || 'Event color updated.', { variant: 'success' })
        if (response?.warning?.message) {
          enqueueSnackbar(response.warning.message, { variant: 'warning' })
        }
        queryClient.invalidateQueries({ queryKey: CALENDAR_ORDERS_QUERY_KEY })
      } catch (err) {
        setOrder(previousOrder)
        previousCalendarOrdersCache.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
        if (err.message === 'logout') return
        enqueueSnackbar(
          err.response?.data?.error || err.message || 'Could not update event color. Please try again.',
          { variant: 'error' }
        )
      }
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
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    },
    []
  )

  return {
    onEventColorChange: debouncedHandleEventColorChange,
  }
}
