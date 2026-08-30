// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PricingComparison from './PricingComparison'
import { createAppOrder, createWordPressOrder, setManualPricing } from '../../shared/orderModel'
import {
  makeWordPressStructuredJsonComplete,
  makeWordPressStructuredJsonMissingPricing,
} from '../../shared/testFixtures/orderFixtures'

function getUpdatedOrder(onChange) {
  expect(onChange).toHaveBeenCalledTimes(1)
  return onChange.mock.calls[0][0]
}

function renderComparison(order, props = {}) {
  const onChange = vi.fn()
  const view = render(React.createElement(PricingComparison, { order, onChange, ...props }))
  return { ...view, onChange }
}

describe('PricingComparison', () => {
  it('shows active, automatic, manual, and initial values for a WordPress order', () => {
    const order = createWordPressOrder(makeWordPressStructuredJsonComplete())

    renderComparison(order)

    expect(screen.getAllByText(/Active source: initial/i)).toHaveLength(3)
    expect(screen.getByText(/Initial: 167 €/i)).toBeInTheDocument()
    expect(screen.getByText(/Automatic: 152 €/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Manual: Not set/i)).toHaveLength(3)
    expect(screen.getAllByText(/Active:/i)).toHaveLength(3)
  })

  it('switches pricing sources independently without copying values', () => {
    const order = createWordPressOrder(makeWordPressStructuredJsonComplete())
    const { onChange, rerender } = renderComparison(order)

    fireEvent.click(screen.getByRole('button', { name: 'Use automatic price' }))
    const automaticPriceOrder = getUpdatedOrder(onChange)
    expect(automaticPriceOrder.pricing.source).toEqual({
      price: 'auto',
      fees: 'initial',
      boxesPrice: 'initial',
    })
    expect(automaticPriceOrder.pricing.manual.price).toBeNull()

    onChange.mockClear()
    rerender(React.createElement(PricingComparison, { order: automaticPriceOrder, onChange }))
    fireEvent.click(screen.getByRole('button', { name: 'Use automatic boxes price' }))
    const automaticBoxesOrder = getUpdatedOrder(onChange)
    expect(automaticBoxesOrder.pricing.source).toEqual({
      price: 'auto',
      fees: 'initial',
      boxesPrice: 'auto',
    })
    expect(automaticBoxesOrder.pricing.manual).toEqual({
      price: null,
      fees: null,
      boxesPrice: null,
    })
  })

  it('commits a manual zero price and an empty manual fee list', () => {
    const order = createAppOrder(makeWordPressStructuredJsonMissingPricing())
    const { onChange, rerender } = renderComparison(order)

    fireEvent.change(screen.getByLabelText('Manual price'), { target: { value: '0' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getAllByText(/Manual: Not set/i)).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Use manual price' }))
    const manualPriceOrder = getUpdatedOrder(onChange)
    expect(manualPriceOrder.pricing.source.price).toBe('manual')
    expect(manualPriceOrder.pricing.manual.price).toBe(0)

    onChange.mockClear()
    rerender(React.createElement(PricingComparison, { order: manualPriceOrder, onChange }))
    fireEvent.click(screen.getByRole('button', { name: 'Use manual fees' }))
    const manualFeesOrder = getUpdatedOrder(onChange)
    expect(manualFeesOrder.pricing.source.fees).toBe('manual')
    expect(manualFeesOrder.pricing.manual.fees).toEqual([])
  })

  it('uses committed manual values as the numeric input and fee selection defaults', () => {
    let order = createAppOrder(makeWordPressStructuredJsonMissingPricing())
    order = setManualPricing(order, 'price', 0)
    order = setManualPricing(order, 'fees', [{ name: 'customFee', amount: 9 }])

    renderComparison(order)

    expect(screen.getByLabelText('Manual price')).toHaveValue(0)
    expect(screen.getByText(/Manual: 0 €/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Manual customFee fee' })).toBeChecked()
  })

  it('supports manual fee selection and manual box price input', () => {
    const order = createAppOrder(makeWordPressStructuredJsonMissingPricing())
    const { onChange, rerender } = renderComparison(order)

    const feeCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(feeCheckbox)
    expect(feeCheckbox).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Use manual fees' }))
    const manualFeesOrder = getUpdatedOrder(onChange)
    expect(manualFeesOrder.pricing.manual.fees).toHaveLength(1)

    onChange.mockClear()
    rerender(React.createElement(PricingComparison, { order: manualFeesOrder, onChange }))
    fireEvent.change(screen.getByLabelText('Manual boxes price'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use manual boxes price' }))
    const manualBoxesOrder = getUpdatedOrder(onChange)
    expect(manualBoxesOrder.pricing.source.boxesPrice).toBe('manual')
    expect(manualBoxesOrder.pricing.manual.boxesPrice).toBe(0)
  })

  it('clears manual values and returns that component to automatic pricing', () => {
    let order = createAppOrder(makeWordPressStructuredJsonMissingPricing())
    order = setManualPricing(order, 'price', 0)
    const { onChange } = renderComparison(order)

    fireEvent.click(screen.getByRole('button', { name: 'Clear manual price' }))
    const clearedOrder = getUpdatedOrder(onChange)
    expect(clearedOrder.pricing.source.price).toBe('auto')
    expect(clearedOrder.pricing.manual.price).toBeNull()
  })

  it('disables initial controls when the WordPress component is missing', () => {
    const order = createWordPressOrder(makeWordPressStructuredJsonMissingPricing())

    renderComparison(order)

    expect(screen.getByRole('button', { name: 'Use initial price' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Use initial fees' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Use initial boxes price' })).toBeDisabled()
  })

  it('does not show initial controls for app orders', () => {
    const order = createAppOrder(makeWordPressStructuredJsonMissingPricing())

    renderComparison(order, { onRevert: vi.fn() })

    expect(screen.queryByText(/^Initial:/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Use initial/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revert entire order' })).not.toBeInTheDocument()
  })

  it('confirms before reverting a WordPress order and invokes the handler when accepted', () => {
    const order = createWordPressOrder(makeWordPressStructuredJsonComplete())
    const onRevert = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderComparison(order, { onRevert })
    fireEvent.click(screen.getByRole('button', { name: 'Revert entire order' }))

    expect(confirm).toHaveBeenCalledWith('Revert the entire order to its initial values?')
    expect(onRevert).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  it('does not invoke the revert handler when confirmation is canceled', () => {
    const order = createWordPressOrder(makeWordPressStructuredJsonComplete())
    const onRevert = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderComparison(order, { onRevert })
    fireEvent.click(screen.getByRole('button', { name: 'Revert entire order' }))

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(onRevert).not.toHaveBeenCalled()
    confirm.mockRestore()
  })
})
