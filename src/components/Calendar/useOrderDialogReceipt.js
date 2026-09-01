import { useCallback, useState } from 'react'
import { enqueueSnackbar } from 'notistack'
import { useHistory } from 'react-router-dom'

import {
  RECEIPT_DRAFT_TTL_MS,
  buildReceiptDraftFromOrder,
  makeReceiptDraftStorageKey,
  normalizeDocumentType,
  normalizeReceiptDraft,
} from './receiptData.helpers'

export default function useOrderDialogReceipt({ order, orderId }) {
  const history = useHistory()
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
      const receiptState = {
        documentType: nextDocumentType,
        receiptDraft: safeDraft,
      }
      const draftKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const storageKey = makeReceiptDraftStorageKey(draftKey)
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...receiptState,
            expiresAt: Date.now() + RECEIPT_DRAFT_TTL_MS,
          }),
        )
      } catch {
        enqueueSnackbar('Could not save receipt details for the new tab. Please try again.', {
          variant: 'error',
        })
        return
      }

      let newWindow = null
      try {
        const receiptUrl = history.createHref({
          pathname: `/calendar/receipt/${encodeURIComponent(orderId)}`,
          search: `?receiptDraftKey=${encodeURIComponent(draftKey)}`,
        })
        newWindow = window.open(receiptUrl, '_blank')
      } catch {
        // Treat browser popup errors like a blocked popup below.
      }

      if (newWindow) {
        setReceiptOpen(false)
        return
      }

      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Best effort cleanup when opening the receipt page is blocked.
      }
      enqueueSnackbar('Failed to open new tab. Please check your browser settings.', {
        variant: 'error',
      })
    },
    [history, orderId, receiptDocumentType]
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
