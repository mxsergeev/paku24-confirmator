// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import PricingEditor from './PricingEditor'
import { setPricingOverride } from '../../shared/orderPricing'
import {
  makeCanonicalAppOrder,
  makeCanonicalWordPressOrder,
} from '../../shared/testFixtures/orderFixtures'

function renderComparison(order) {
  const onChange = vi.fn()
  const view = render(React.createElement(PricingEditor, { order, onChange }))
  return { ...view, onChange }
}

function updatedOrder(onChange) {
  expect(onChange).toHaveBeenCalledTimes(1)
  return onChange.mock.calls[0][0]
}

describe('PricingEditor', () => {
  it('shows automatic and effective values without pricing source state', () => {
    renderComparison(makeCanonicalWordPressOrder())

    expect(screen.getByText('Automatic: 152 €')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Price' })).toHaveTextContent('Effective: 152 €')
    expect(screen.queryByText(/Active source|Initial source|Manual source/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View original WordPress order' })).toBeInTheDocument()
  })

  it('commits and clears a manual zero price', () => {
    const { onChange, rerender } = renderComparison(makeCanonicalAppOrder())
    const priceRow = screen.getByRole('region', { name: 'Price' })

    fireEvent.change(screen.getByLabelText('Manual price override'), { target: { value: '0' } })
    fireEvent.click(within(priceRow).getByRole('button', { name: 'Use manual override' }))
    const manualOrder = updatedOrder(onChange)
    expect(manualOrder.pricingOverrides.price).toBe(0)

    onChange.mockClear()
    rerender(React.createElement(PricingEditor, { order: manualOrder, onChange }))
    fireEvent.click(within(screen.getByRole('region', { name: 'Price' })).getByRole('button', {
      name: 'Use automatic',
    }))
    expect(updatedOrder(onChange).pricingOverrides.price).toBeNull()
  })

  it('commits an empty manual fee list and preserves a manual boxes price', () => {
    const order = setPricingOverride(makeCanonicalAppOrder(), 'boxesPrice', 40)
    const { onChange, rerender } = renderComparison(order)
    const feesRow = screen.getByRole('region', { name: 'Fees' })

    fireEvent.click(within(feesRow).getByRole('button', { name: 'Use manual override' }))
    const manualFeesOrder = updatedOrder(onChange)
    expect(manualFeesOrder.pricingOverrides.fees).toEqual([])
    expect(manualFeesOrder.pricingOverrides.boxesPrice).toBe(40)

    onChange.mockClear()
    rerender(React.createElement(PricingEditor, { order: manualFeesOrder, onChange }))
    expect(screen.getByLabelText('Manual boxes price override')).toHaveValue(40)
    expect(screen.getByRole('region', { name: 'Boxes price' })).toHaveTextContent('Effective: 40 €')
  })

  it('allows selecting a manual fee and viewing the immutable reference', () => {
    const { onChange } = renderComparison(makeCanonicalWordPressOrder())
    const feesRow = screen.getByRole('region', { name: 'Fees' })
    const fee = within(feesRow).getAllByRole('checkbox')[0]

    fireEvent.click(fee)
    fireEvent.click(within(feesRow).getByRole('button', { name: 'Use manual override' }))
    expect(updatedOrder(onChange).pricingOverrides.fees).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'View original WordPress order' }))
    expect(screen.getByRole('dialog', { name: 'Original WordPress order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply|revert|restore|copy/i })).not.toBeInTheDocument()
  })
})
