import { useQuery } from '@tanstack/react-query'
import ordersAPI from '../services/ordersAPI'

export function useRoutedOrder(orderId) {
  return useQuery({
    queryKey: ['order-by-id', orderId],
    queryFn: async () => {
      const response = await ordersAPI.getById(orderId)
      return response?.order || response
    },
    enabled: Boolean(orderId),
    retry: false,
  })
}
