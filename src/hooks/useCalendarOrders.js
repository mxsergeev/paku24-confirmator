import { useQuery } from '@tanstack/react-query'
import ordersAPI from '../services/ordersAPI'

export function useCalendarOrders({ from, to, deleted = false } = {}) {
  return useQuery({
    queryKey: ['calendar-orders', from, to, deleted === null ? 'all' : deleted],
    queryFn: () => ordersAPI.getByRange({ from, to, deleted }),
    enabled: !!from && !!to,
  })
}
