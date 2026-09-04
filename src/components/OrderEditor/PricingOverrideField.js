import React, { useEffect, useState } from 'react'
import { InputAdornment, TextField } from '@material-ui/core'
import { parseAndFormatDecimalString, sanitizeDecimalString } from '../../helpers/decimalStringHelpers'

function overrideInputValue(value) {
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
  const [inputValue, setInputValue] = useState(() => overrideInputValue(overrideValue))

  useEffect(() => {
    setInputValue(overrideInputValue(overrideValue))
  }, [overrideValue])

  if (!order) return null

  function commit() {
    const { formatted, numeric } = parseAndFormatDecimalString(inputValue)
    setInputValue(formatted)
    onChange?.({
      ...order,
      pricingOverrides: { ...order.pricingOverrides, [component]: numeric },
    })
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
      onChange={(event) => setInputValue(sanitizeDecimalString(event.target.value))}
      onBlur={commit}
      helperText={`Automatic: ${automaticValue} €`}
      inputProps={{ inputMode: 'decimal' }}
      InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
      style={style}
    />
  )
}
