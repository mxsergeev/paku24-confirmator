// @vitest-environment jsdom

import React, { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@date-io/dayjs', () => ({ default: function DayjsUtils() {} }))
vi.mock('@material-ui/pickers', () => ({
  DatePicker: () => null,
  DateTimePicker: () => null,
  MuiPickersUtilsProvider: ({ children }) => children,
}))

import Boxes from './Boxes'
import { makeCanonicalAppOrder } from '../../shared/testFixtures/orderFixtures'

describe('Boxes pricing', () => {
  it('edits the boxes price in place and supports zero and clearing', () => {
    const onChange = vi.fn()

    function Harness() {
      const [order, setOrder] = useState(makeCanonicalAppOrder())

      return (
        <Boxes
          order={order}
          handleChange={() => {}}
          onOrderChange={(nextOrder) => {
            onChange(nextOrder)
            setOrder(nextOrder)
          }}
        />
      )
    }

    render(<Harness />)
    fireEvent.click(screen.getByText('Boxes'))

    const input = screen.getByRole('textbox', { name: 'Price' })
    expect(input).toHaveValue('0')

    fireEvent.change(input, { target: { value: '12,50' } })
    fireEvent.blur(input)
    expect(onChange.mock.lastCall[0].pricingOverrides.boxesPrice).toBe(12.5)

    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(onChange.mock.lastCall[0].pricingOverrides.boxesPrice).toBe(0)

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onChange.mock.lastCall[0].pricingOverrides.boxesPrice).toBeNull()
    expect(input).toHaveValue('0')
  })

  it('renders and materializes complete boxes data when the order has no boxes', () => {
    const onChange = vi.fn()
    const sparseOrder = { ...makeCanonicalAppOrder(), boxes: undefined }

    render(
      <Boxes
        order={sparseOrder}
        handleChange={onChange}
        onOrderChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Boxes'))

    const amount = screen.getByRole('combobox', { name: '' })
    fireEvent.change(amount, { target: { value: '10' } })

    expect(onChange).toHaveBeenCalledWith(
      'boxes',
      expect.objectContaining({
        deliveryDate: sparseOrder.date,
        returnDate: sparseOrder.date,
        amount: 10,
      }),
    )
  })

  it('materializes null box fields before an edit', () => {
    const onChange = vi.fn()
    const sparseOrder = {
      ...makeCanonicalAppOrder(),
      boxes: { deliveryDate: null, returnDate: null, amount: null },
    }

    render(
      <Boxes
        order={sparseOrder}
        handleChange={onChange}
        onOrderChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Boxes'))
    fireEvent.change(screen.getByRole('combobox', { name: '' }), {
      target: { value: '10' },
    })

    expect(onChange).toHaveBeenCalledWith(
      'boxes',
      expect.objectContaining({
        deliveryDate: sparseOrder.date,
        returnDate: sparseOrder.date,
        amount: 10,
      }),
    )
  })
})
