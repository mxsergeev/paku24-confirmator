// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  makeCanonicalAppOrder,
  makeCanonicalWordPressOrder,
} from '../shared/testFixtures/orderFixtures'
import { serializeDraft } from '../shared/orderSerialization'
import { readOrderDraft, useOrderDraft } from './useOrderDraft'

const STORAGE_KEY = 'order-draft-test'

function DraftHarness({ order, enabled = true, skipPersistence = false }) {
  const { skipNextPersistence } = useOrderDraft(STORAGE_KEY, {
    value: order,
    enabled,
    skipPersistence,
  })

  return <button onClick={skipNextPersistence}>Skip next save</button>
}

describe('useOrderDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it.each([
    ['app', makeCanonicalAppOrder()],
    ['WordPress', makeCanonicalWordPressOrder()],
  ])('reloads a %s draft through the browser storage boundary', (_name, order) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeDraft(order)))

    const restored = readOrderDraft(STORAGE_KEY)

    expect(restored).toEqual(order)
  })

  it('removes malformed and unsupported drafts after a failed read', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, order: { origin: 'app' } })
    )

    expect(readOrderDraft(STORAGE_KEY)).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('skips one write after reset-style state replacement', () => {
    const firstOrder = makeCanonicalAppOrder()
    const nextOrder = makeCanonicalAppOrder({ name: 'Next customer' })
    const { rerender, getByRole } = render(<DraftHarness order={firstOrder} />)
    const firstDraft = window.localStorage.getItem(STORAGE_KEY)

    fireEvent.click(getByRole('button', { name: 'Skip next save' }))
    rerender(<DraftHarness order={nextOrder} />)

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(firstDraft)

    rerender(<DraftHarness order={firstOrder} />)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).order.name).toBe('App Customer')
  })

  it('does not persist while disabled for an explicitly loaded order', () => {
    const order = makeCanonicalAppOrder()

    render(<DraftHarness order={order} enabled={false} />)

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('treats draft serialization failures as best effort', () => {
    const previousDraft = JSON.stringify({ version: 1, order: { preserved: true } })
    window.localStorage.setItem(STORAGE_KEY, previousDraft)

    expect(() => render(<DraftHarness order={{}} />)).not.toThrow()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(previousDraft)
  })
})
