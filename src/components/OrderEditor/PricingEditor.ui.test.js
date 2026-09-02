// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import PricingEditor from './PricingEditor'
import { clearPricingOverride, setPricingOverride } from '../../shared/orderPricing'
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
    const input = within(priceRow).getByLabelText('Manual price override')

    fireEvent.change(input, { target: { value: '0' } })
    expect(input.value).toBe('0')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    const manualOrder = updatedOrder(onChange)
    expect(manualOrder.pricingOverrides.price).toBe(0)

    onChange.mockClear()
    rerender(React.createElement(PricingEditor, { order: manualOrder, onChange }))
    fireEvent.click(within(screen.getByRole('region', { name: 'Price' })).getByRole('button', {
      name: 'Use automatic',
    }))
    expect(updatedOrder(onChange).pricingOverrides.price).toBeNull()
    expect(
      within(screen.getByRole('region', { name: 'Price' })).getByLabelText(
        'Manual price override',
      ).value,
    ).toBe('')
  })

  it('keeps temporary decimal input until blur and commits a decimal value', () => {
    const { onChange } = renderComparison(makeCanonicalAppOrder())
    const input = screen.getByLabelText('Manual price override')

    fireEvent.change(input, { target: { value: '1.' } })
    expect(input.value).toBe('1.')
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '125.50' } })
    expect(input.value).toBe('125.50')
    fireEvent.blur(input)

    expect(updatedOrder(onChange).pricingOverrides.price).toBe(125.5)
  })

  it('clears a numeric override when the input is emptied and blurred', () => {
    const order = setPricingOverride(makeCanonicalAppOrder(), 'price', 220)
    const { onChange } = renderComparison(order)
    const input = screen.getByLabelText('Manual price override')

    expect(input.value).toBe('220')
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(input)

    expect(updatedOrder(onChange).pricingOverrides.price).toBeNull()
  })

  it('resynchronizes a numeric input when the parent override changes', () => {
    const order = makeCanonicalAppOrder()
    const { onChange, rerender } = renderComparison(order)
    const input = screen.getByLabelText('Manual price override')

    fireEvent.change(input, { target: { value: '1.' } })
    expect(input.value).toBe('1.')

    const manualOrder = setPricingOverride(order, 'price', 125.5)
    rerender(React.createElement(PricingEditor, { order: manualOrder, onChange }))
    expect(input.value).toBe('125.5')

    const automaticOrder = clearPricingOverride(manualOrder, 'price')
    rerender(React.createElement(PricingEditor, { order: automaticOrder, onChange }))
    expect(input.value).toBe('')
  })

  it('edits and commits the boxes price with the same numeric input behavior', () => {
    const { onChange } = renderComparison(makeCanonicalAppOrder())
    const input = screen.getByLabelText('Manual boxes price override')

    fireEvent.change(input, { target: { value: '12.50' } })
    expect(input.value).toBe('12.50')
    fireEvent.blur(input)

    expect(updatedOrder(onChange).pricingOverrides.boxesPrice).toBe(12.5)
  })

  it('commits only once when a focused input action is clicked', () => {
    const { onChange } = renderComparison(makeCanonicalAppOrder())
    const priceRow = screen.getByRole('region', { name: 'Price' })
    const input = within(priceRow).getByLabelText('Manual price override')
    const manualButton = within(priceRow).getByRole('button', { name: 'Use manual override' })

    fireEvent.change(input, { target: { value: '125.50' } })
    input.focus()
    fireEvent.blur(input, { relatedTarget: manualButton })
    fireEvent.click(manualButton)

    expect(updatedOrder(onChange).pricingOverrides.price).toBe(125.5)
  })

  it('clears only once when automatic is clicked from a focused input', () => {
    const order = setPricingOverride(makeCanonicalAppOrder(), 'price', 220)
    const { onChange } = renderComparison(order)
    const priceRow = screen.getByRole('region', { name: 'Price' })
    const input = within(priceRow).getByLabelText('Manual price override')
    const automaticButton = within(priceRow).getByRole('button', { name: 'Use automatic' })

    input.focus()
    fireEvent.blur(input, { relatedTarget: automaticButton })
    fireEvent.click(automaticButton)

    expect(updatedOrder(onChange).pricingOverrides.price).toBeNull()
    expect(input.value).toBe('')
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
    expect(screen.getByLabelText('Manual boxes price override').value).toBe('40')
    expect(screen.getByRole('region', { name: 'Boxes price' })).toHaveTextContent('Effective: 40 €')
  })

  it('allows selecting a manual fee and viewing the immutable reference', () => {
    const { onChange } = renderComparison(makeCanonicalWordPressOrder())
    const feesRow = screen.getByRole('region', { name: 'Fees' })
    const fee = within(feesRow).getAllByRole('checkbox')[0]

    fireEvent.click(fee)
    const manualOrder = updatedOrder(onChange)
    expect(manualOrder.pricingOverrides.fees).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'View original WordPress order' }))
    expect(screen.getByRole('dialog', { name: 'Original WordPress order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply|revert|restore|copy/i })).not.toBeInTheDocument()
  })
})
