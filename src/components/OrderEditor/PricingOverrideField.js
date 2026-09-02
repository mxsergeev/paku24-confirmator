import React, { useEffect, useRef, useState } from 'react'
import { InputAdornment, TextField } from '@material-ui/core'
import {
  parseAndFormatDecimalString,
  sanitizeDecimalString,
} from '../../helpers/decimalStringHelpers'
import { clearPricingOverride, setPricingOverride } from '../../shared/orderPricing'

function toInputValue(overrideValue, automaticValue) {
  const value = overrideValue === null || overrideValue === undefined
    ? automaticValue
    : overrideValue

  return value === null || value === undefined ? '' : String(value)
}

export default function PricingOverrideField({
  order,
  component,
  automaticValue,
  label,
  name,
  onChange,
  className,
  style,
}) {
  const overrideValue = order?.pricingOverrides?.[component]
  const [inputValue, setInputValue] = useState(() =>
    toInputValue(overrideValue, automaticValue),
  )
  const focused = useRef(false)
  const dirty = useRef(false)

  useEffect(() => {
    if (!focused.current) {
      setInputValue(toInputValue(overrideValue, automaticValue))
    }
  }, [automaticValue, overrideValue])

  if (!order) return null

  function commit() {
    focused.current = false

    if (!dirty.current) {
      setInputValue(toInputValue(overrideValue, automaticValue))
      return
    }

    const { formatted, numeric } = parseAndFormatDecimalString(inputValue)
    dirty.current = false

    if (numeric === null) {
      setInputValue(toInputValue(null, automaticValue))
      if (overrideValue !== null && overrideValue !== undefined) {
        onChange?.(clearPricingOverride(order, component))
      }
      return
    }

    setInputValue(formatted)
    if (overrideValue !== numeric) {
      onChange?.(setPricingOverride(order, component, numeric))
    }
  }

  return (
    <TextField
      fullWidth
      className={className}
      id={`${component}-pricing-input`}
      name={name}
      label={label}
      variant="outlined"
      size="small"
      value={inputValue}
      onFocus={() => {
        focused.current = true
        dirty.current = false
      }}
      onChange={(event) => {
        dirty.current = true
        setInputValue(sanitizeDecimalString(event.target.value))
      }}
      onBlur={commit}
      inputProps={{ inputMode: 'decimal' }}
      InputProps={{
        endAdornment: <InputAdornment position="end">€</InputAdornment>,
      }}
      style={style}
    />
  )
}
