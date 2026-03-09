import { useQuery } from '@tanstack/react-query'
import orderPoolAPI from '../services/orderPoolAPI'

export function useCalendarOrders(from, to, deleted = false) {
  return useQuery({
    queryKey: ['calendar-orders', from, to, deleted],
    queryFn: () => orderPoolAPI.getByRange(from, to, deleted),
    enabled: !!from && !!to,
  })
}
