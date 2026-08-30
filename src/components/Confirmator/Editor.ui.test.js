// @vitest-environment jsdom

import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Editor from './Editor'
import { createWordPressOrder, updateOrderField } from '../../shared/orderModel'
import { toUpdateOrderPayload } from '../../shared/orderSerialization'
import {
  makeWordPressStructuredJsonComplete,
} from '../../shared/testFixtures/orderFixtures'

vi.mock('./Address', () => ({
  default: function TestAddress({ value = {}, onChange, onRemove, showRemove = false }) {
    return (
      <div data-testid="address-row">
        <input
          aria-label={`Street ${value.street || 'empty'}`}
          value={value.street || ''}
          onChange={(event) => onChange?.({ ...value, street: event.target.value })}
        />
        {showRemove && <button onClick={onRemove}>Remove address</button>}
      </div>
    )
  },
}))

vi.mock('./Boxes', () => ({ default: () => null }))
vi.mock('./PricingComparison', () => ({ default: () => null }))
vi.mock('@material-ui/core', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  NativeSelect: ({ children, fullWidth, ...props }) => <select {...props}>{children}</select>,
  TextField: ({ fullWidth, variant, size, label, required, ...props }) => <input {...props} />,
  TextareaAutosize: ({ rowsMin, ...props }) => <textarea {...props} />,
}))
vi.mock('@material-ui/core/Button', () => ({
  default: ({ children, ...props }) => <button {...props}>{children}</button>,
}))
vi.mock('@material-ui/core/TextField', () => ({
  default: ({ fullWidth, variant, size, label, required, ...props }) => <input {...props} />,
}))
vi.mock('@material-ui/core/NativeSelect', () => ({
  default: ({ children, fullWidth, ...props }) => <select {...props}>{children}</select>,
}))
vi.mock('@material-ui/core/TextareaAutosize', () => ({
  default: ({ rowsMin, ...props }) => <textarea {...props} />,
}))
vi.mock('@material-ui/icons/PlaylistAddRounded', () => ({ default: () => null }))
vi.mock('@date-io/dayjs', () => ({ default: function DayjsUtils() {} }))
vi.mock('@material-ui/pickers', () => ({
  DateTimePicker: () => null,
  MuiPickersUtilsProvider: ({ children }) => children,
}))

function makeOrderWithTwoExtraAddresses() {
  const input = makeWordPressStructuredJsonComplete()
  input.extraAddresses = [
    input.extraAddresses[0],
    {
      street: 'Runeberginkatu 12',
      index: '00100',
      city: 'Helsinki',
      floor: 2,
      elevator: true,
    },
  ]
  return createWordPressOrder(input)
}

function EditorHarness({ initialOrder, onOrderChange }) {
  const [order, setOrder] = useState(initialOrder)

  const handleChange = (key, value) => {
    setOrder((previous) => {
      const updated = updateOrderField(previous, key, value)
      onOrderChange?.(updated)
      return updated
    })
  }

  return <Editor order={order} handleChange={handleChange} />
}

describe('Editor extra address identity', () => {
  it('edits only the second row, removes only the first, and serializes the surviving row', () => {
    const initialOrder = makeOrderWithTwoExtraAddresses()
    const onOrderChange = vi.fn()
    const view = render(
      <EditorHarness initialOrder={initialOrder} onOrderChange={onOrderChange} />,
    )

    fireEvent.change(screen.getByDisplayValue('Runeberginkatu 12'), {
      target: { value: 'Kalevankatu 8' },
    })

    let updatedOrder = onOrderChange.mock.lastCall[0]
    expect(updatedOrder.extraAddresses[0]).toEqual(initialOrder.extraAddresses[0])
    expect(updatedOrder.extraAddresses[1]).toMatchObject({ street: 'Kalevankatu 8' })

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove address' })[0])
    updatedOrder = onOrderChange.mock.lastCall[0]

    expect(updatedOrder.extraAddresses).toEqual([
      expect.objectContaining({ street: 'Kalevankatu 8' }),
    ])
    const updatePayload = toUpdateOrderPayload(updatedOrder)
    expect(updatePayload.extraAddresses).toEqual([
      expect.objectContaining({ street: 'Kalevankatu 8' }),
    ])
    expect(updatePayload.extraAddresses[0]).not.toHaveProperty('id')
    expect(updatePayload.extraAddresses[0]).not.toHaveProperty('_uiId')

    // Reopening from the serialized update keeps the second row and does not
    // resurrect the removed first row.
    view.rerender(
      <EditorHarness
        key="reopened"
        initialOrder={createWordPressOrder({
          ...makeWordPressStructuredJsonComplete(),
          extraAddresses: updatePayload.extraAddresses,
        })}
      />,
    )
    expect(screen.getByDisplayValue('Kalevankatu 8')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Mechelininkatu 20')).not.toBeInTheDocument()
  })
})
