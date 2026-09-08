import React, { useEffect, useRef, useState } from 'react'
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
  const showAutomaticHelper =
    component === 'price' && overrideValue !== null && overrideValue !== undefined
  const [inputValue, setInputValue] = useState(() =>
    overrideInputValue(overrideValue ?? automaticValue),
  )
  const edited = useRef(false)

  useEffect(() => {
    if (!edited.current) {
      setInputValue(overrideInputValue(overrideValue ?? automaticValue))
    }
  }, [automaticValue, overrideValue])

  if (!order) return null

  function commit() {
    if (!edited.current) return

    edited.current = false
    const { formatted, numeric } = parseAndFormatDecimalString(inputValue)
    setInputValue(formatted || overrideInputValue(automaticValue))
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
      onChange={(event) => {
        edited.current = true
        setInputValue(sanitizeDecimalString(event.target.value))
      }}
      onBlur={commit}
      helperText={showAutomaticHelper ? `Automatic: ${automaticValue} €` : undefined}
      inputProps={{ inputMode: 'decimal' }}
      InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
      style={style}
    />
  )
}
