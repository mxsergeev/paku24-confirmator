import { useCallback, useEffect, useRef } from 'react'
import { deserializeDraft, serializeDraft } from '../shared/orderSerialization'

function getStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Read and validate a draft from browser storage.
 * Invalid or stale drafts are removed so they cannot fail every future mount.
 */
export function readOrderDraft(storageKey) {
  const storage = getStorage()
  if (!storage) return null

  try {
    const storedDraft = storage.getItem(storageKey)
    if (!storedDraft) return null

    return deserializeDraft(JSON.parse(storedDraft))
  } catch {
    try {
      storage.removeItem(storageKey)
    } catch {
      // Storage can be unavailable in private browsing or a restricted iframe.
    }
    return null
  }
}

function writeOrderDraft(storageKey, order) {
  const storage = getStorage()
  if (!storage) return

  try {
    const serializedDraft = JSON.stringify(serializeDraft(order))
    storage.setItem(storageKey, serializedDraft)
  } catch {
    // Persistence is best effort when order serialization, browser storage, or
    // JSON encoding fails.
  }
}

function clearOrderDraft(storageKey) {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(storageKey)
  } catch {
    // Clearing a draft is best effort when browser storage is unavailable.
  }
}

/**
 * Keep the browser draft lifecycle in one small place. This intentionally
 * does not own order state or decide when a workflow is complete.
 */
export function useOrderDraft(
  storageKey,
  { value, enabled = true, skipPersistence = false } = {}
) {
  const skipNextPersistenceRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof value === 'undefined') return

    if (skipPersistence || skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false
      return
    }

    writeOrderDraft(storageKey, value)
  }, [enabled, skipPersistence, storageKey, value])

  const readDraft = useCallback(() => readOrderDraft(storageKey), [storageKey])
  const clearDraft = useCallback(() => clearOrderDraft(storageKey), [storageKey])
  const skipNextPersistence = useCallback(() => {
    skipNextPersistenceRef.current = true
  }, [])

  return {
    readDraft,
    clearDraft,
    skipNextPersistence,
  }
}
