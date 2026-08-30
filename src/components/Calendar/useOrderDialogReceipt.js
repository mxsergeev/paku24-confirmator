import { useCallback, useState } from 'react'
import { enqueueSnackbar } from 'notistack'

import {
  buildReceiptDraftFromOrder,
  normalizeDocumentType,
  normalizeReceiptDraft,
} from './receiptData.helpers'

export default function useOrderDialogReceipt({ order, orderId }) {
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptDraft, setReceiptDraft] = useState(null)
  const [receiptDocumentType, setReceiptDocumentType] = useState('receipt')

  const handleReceiptOpen = useCallback(
    (documentType) => {
      if (!order) return
      const nextDocumentType = normalizeDocumentType(documentType)

      setReceiptDocumentType(nextDocumentType)
      setReceiptDraft({
        ...buildReceiptDraftFromOrder(order),
        documentType: nextDocumentType,
      })
      setReceiptOpen(true)
    },
    [order]
  )

  const handleReceiptClose = useCallback(() => {
    setReceiptOpen(false)
  }, [])

  const handleReceiptPageOpen = useCallback(
    (draft) => {
      if (!orderId) {
        enqueueSnackbar('Order ID is missing.', { variant: 'warning' })
        return
      }

      const nextDocumentType = normalizeDocumentType(receiptDocumentType)
      const safeDraft = normalizeReceiptDraft(draft, nextDocumentType)

      if (!safeDraft) {
        enqueueSnackbar('Receipt details are invalid. Review required fields.', {
          variant: 'warning',
        })
        return
      }

      if (!safeDraft.customerEmail) {
        enqueueSnackbar('Add client email to create a receipt.', { variant: 'warning' })
        return
      }

      setReceiptDraft(safeDraft)
      setReceiptOpen(false)
      const receiptUrl = `/calendar/receipt/${orderId}`
      const receiptState = {
        fromCalendar: true,
        documentType: nextDocumentType,
        receiptDraft: safeDraft,
      }
      const newWindow = window.open(receiptUrl, '_blank')
      if (newWindow) {
        newWindow.state = receiptState
      } else {
        enqueueSnackbar('Failed to open new tab. Please check your browser settings.', {
          variant: 'error',
        })
      }
    },
    [orderId, receiptDocumentType]
  )

  return {
    handleReceiptClose,
    handleReceiptOpen,
    handleReceiptPageOpen,
    receiptDocumentType,
    receiptDraft,
    receiptOpen,
  }
}
