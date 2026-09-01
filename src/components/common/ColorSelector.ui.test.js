// @vitest-environment jsdom

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@material-ui/core', () => ({
  Select: ({ children, name, onChange, renderValue, value }) => (
    <div>
      <span>{renderValue(value)}</span>
      <select name={name} value={value} onChange={onChange} aria-label="Event color">
        {children}
      </select>
    </div>
  ),
  MenuItem: ({ children, value }) => {
    const label = React.Children.toArray(children).find((child) => typeof child === 'string')
    return <option value={value}>{label || value}</option>
  },
}))

import ColorSelector from './ColorSelector'

describe('ColorSelector', () => {
  it('renders the nullable automatic color state and accepts a configured color', () => {
    const onChange = vi.fn()

    render(
      <ColorSelector
        value={null}
        onChange={onChange}
        colors={{ '1': { name: 'Lavender', hex: '#7986cb' } }}
      />,
    )

    expect(screen.getByRole('option', { name: 'Automatic' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), {
      target: { name: 'eventColor', value: '1' },
    })

    expect(onChange).toHaveBeenCalledWith('eventColor', '1')
  })
})
