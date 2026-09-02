// @vitest-environment jsdom

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

vi.mock('@material-ui/core', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  FormControl: ({ children, ...props }) => <div {...props}>{children}</div>,
  InputLabel: ({ children, ...props }) => <label {...props}>{children}</label>,
  Menu: ({ children, open, ...props }) => (open ? <div {...props}>{children}</div> : null),
  MenuItem: ({ children, ...props }) => <div {...props}>{children}</div>,
  Select: ({ children, inputProps, ...props }) => (
    <select {...inputProps} {...props}>
      {children}
    </select>
  ),
  TextField: ({ label, ...props }) => <input aria-label={label} {...props} />,
}))
vi.mock('@material-ui/icons/MenuRounded', () => ({ default: () => null }))

import Address from './Address'

describe('Address editor', () => {
  it('normalizes a null address into an editable empty address', () => {
    const onChange = vi.fn()

    render(<Address value={null} onChange={onChange} />)

    const street = screen.getByRole('textbox', { name: 'Address' })
    expect(street).toHaveValue('')

    fireEvent.change(street, { target: { value: 'New address' } })

    expect(onChange).toHaveBeenCalledWith({
      street: 'New address',
      index: '',
      city: '',
      floor: 0,
      elevator: false,
    })
  })
})
