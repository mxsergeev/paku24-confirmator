// @vitest-environment jsdom

import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import PricingEditor from './PricingEditor'
import { updateOrderField } from '../../shared/orderModel'
import { setPricingOverride } from '../../shared/orderPricing'
import {
  makeCanonicalAppOrder,
  makeCanonicalWordPressOrder,
} from '../../shared/testFixtures/orderFixtures'

function renderPricingEditor(initialOrder) {
  const onChange = vi.fn()

  function Harness() {
    const [order, setOrder] = useState(initialOrder)

    return (
      <PricingEditor
        order={order}
        onChange={(nextOrder) => {
          onChange(nextOrder)
          setOrder(nextOrder)
        }}
      />
    )
  }

  return { ...render(<Harness />), onChange }
}

function lastOrder(onChange) {
  expect(onChange).toHaveBeenCalled()
  return onChange.mock.lastCall[0]
}

describe('PricingEditor', () => {
  it('uses one compact price field for automatic pricing', () => {
    renderPricingEditor(makeCanonicalAppOrder())

    expect(screen.getByRole('textbox', { name: 'Price estimate' })).toHaveValue('100')
    expect(screen.queryByText(/Automatic:|Effective:/i)).not.toBeInTheDocument()
  })

  it('accepts Finnish and dotted decimal price input, including zero', () => {
    const { onChange } = renderPricingEditor(makeCanonicalAppOrder())
    const input = screen.getByRole('textbox', { name: 'Price estimate' })

    fireEvent.change(input, { target: { value: '125,50' } })
    expect(input).toHaveValue('125.50')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(input)
    expect(lastOrder(onChange).pricingOverrides.price).toBe(125.5)

    fireEvent.change(input, { target: { value: '125.50' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('125.50')

    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(lastOrder(onChange).pricingOverrides.price).toBe(0)
  })

  it('clearing a manual price returns the automatic value', () => {
    const order = setPricingOverride(makeCanonicalAppOrder(), 'price', 220)
    const { onChange } = renderPricingEditor(order)
    const input = screen.getByRole('textbox', { name: 'Price estimate' })

    expect(input).toHaveValue('220')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    expect(lastOrder(onChange).pricingOverrides.price).toBeNull()
    expect(input).toHaveValue('100')
  })

  it('shows composed component overrides while the total remains automatic', () => {
    const order = {
      ...makeCanonicalAppOrder(),
      pricingOverrides: {
        price: null,
        fees: [{ name: 'customFee', amount: 20 }],
        boxesPrice: 12,
      },
    }

    renderPricingEditor(order)

    expect(screen.getByRole('textbox', { name: 'Price estimate' })).toHaveValue('132')
  })

  it('preserves a manual price when booking data changes', () => {
    const order = setPricingOverride(makeCanonicalAppOrder(), 'price', 220)
    const { onChange, rerender } = renderPricingEditor(order)

    rerender(
      <PricingEditor
        order={updateOrderField(order, 'duration', 3)}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Price estimate' })).toHaveValue('220')
  })

  it('switches between automatic, manual, and explicit no-fees modes', () => {
    const order = makeCanonicalAppOrder({ date: '2026-06-20T06:00:00.000Z' })
    const { onChange } = renderPricingEditor(order)

    fireEvent.click(screen.getByRole('button', { name: 'Manage fees' }))
    const dialog = screen.getByRole('dialog', { name: 'Fees' })
    const automatic = within(dialog).getByRole('radio', { name: 'Automatic' })
    const manual = within(dialog).getByRole('radio', { name: 'Manual' })
    const weekendFee = within(dialog).getByRole('checkbox', {
      name: 'Select VIIKONLOPPULISÄ fee',
    })

    expect(automatic).toBeChecked()
    expect(weekendFee).toBeChecked()
    expect(weekendFee).toBeDisabled()

    fireEvent.click(manual)
    expect(lastOrder(onChange).pricingOverrides.fees).toHaveLength(1)
    expect(weekendFee).not.toBeDisabled()

    fireEvent.click(weekendFee)
    expect(lastOrder(onChange).pricingOverrides.fees).toEqual([])

    fireEvent.click(automatic)
    expect(lastOrder(onChange).pricingOverrides.fees).toBeNull()
  })

  it('keeps the original WordPress order read-only', () => {
    renderPricingEditor(makeCanonicalWordPressOrder())

    fireEvent.click(screen.getByRole('button', { name: 'View original WordPress order' }))

    expect(screen.getByRole('dialog', { name: 'Original WordPress order' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply|revert|restore|copy/i })).not.toBeInTheDocument()
  })
})
