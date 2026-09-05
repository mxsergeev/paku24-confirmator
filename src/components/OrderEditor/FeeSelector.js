import React, { useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
} from '@material-ui/core'
import { calculateAutomaticFees, getAvailableFees } from '../../shared/fees'

function feeLabel(fee) {
  return `${fee.label || fee.name} (${fee.amount}€)`
}

function getFeeOptions(order, manualFees) {
  const availableFees = getAvailableFees(order)
  const knownNames = new Set(availableFees.map((fee) => fee.name))
  const additionalFees = Array.isArray(manualFees)
    ? manualFees.filter((fee) => !knownNames.has(fee.name))
    : []

  return availableFees.concat(additionalFees)
}

export default function FeeSelector({ order, onChange }) {
  const [open, setOpen] = useState(false)

  if (!order) return null

  const automaticFees = calculateAutomaticFees(order)
  const manualFees = Array.isArray(order.pricingOverrides?.fees)
    ? order.pricingOverrides.fees
    : null
  const selectedFees = manualFees || automaticFees
  const feeOptions = getFeeOptions(order, manualFees)

  function selectMode(mode) {
    onChange?.({
      ...order,
      pricingOverrides: { ...order.pricingOverrides, fees: mode === 'manual' ? selectedFees : null },
    })
  }

  function toggleFee(fee) {
    if (!manualFees) return

    const selected = manualFees.some((item) => item.name === fee.name)
    const nextFees = selected
      ? manualFees.filter((item) => item.name !== fee.name)
      : manualFees.concat(fee)

    onChange?.({
      ...order,
      pricingOverrides: { ...order.pricingOverrides, fees: nextFees },
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outlined"
        size="small"
        aria-label="Manage fees"
        aria-haspopup="dialog"
        style={{ marginTop: 5, alignSelf: 'flex-start' }}
      >
        Fees
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="fee-dialog-title"
      >
        <DialogTitle id="fee-dialog-title">Fees</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="Fee pricing mode"
              name="fee-pricing-mode"
              value={manualFees ? 'manual' : 'automatic'}
              onChange={(event) => selectMode(event.target.value)}
            >
              <FormControlLabel
                value="automatic"
                control={<Radio color="primary" />}
                label="Automatic"
              />
              <FormControlLabel
                value="manual"
                control={<Radio color="primary" />}
                label="Manual"
              />
            </RadioGroup>
          </FormControl>
          {feeOptions.length > 0 ? (
            <FormGroup>
              {feeOptions.map((fee) => (
                <FormControlLabel
                  key={fee.name}
                  label={feeLabel(fee)}
                  control={
                    <Checkbox
                      color="primary"
                      checked={selectedFees.some((item) => item.name === fee.name)}
                      disabled={!manualFees}
                      onChange={() => toggleFee(fee)}
                      inputProps={{ 'aria-label': `Select ${fee.label || fee.name} fee` }}
                    />
                  }
                />
              ))}
            </FormGroup>
          ) : (
            <p>No fees available for this service.</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
