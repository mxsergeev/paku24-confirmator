import React, { useState, useCallback } from 'react'
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from '@material-ui/core'
import { useTheme } from '@material-ui/core/styles'
import './FeeSelector.css'

import Order from '../../../shared/Order'

export default function FeeSelector({ order, onChange }) {
  const [openDialog, setOpenDialog] = useState(false)
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const handleOpen = useCallback(() => setOpenDialog(true), [])
  const handleClose = useCallback(() => setOpenDialog(false), [])

  const handleFeeChange = useCallback(
    (fee, isChecked) => {
      if (isChecked) {
        const newFees = order?.fees ? order.fees.concat(fee) : [fee]
        onChange(newFees)
      } else {
        if (!order?.fees) return
        onChange(order.fees.filter((f) => f.name !== fee.name))
      }
    },
    [order?.fees, onChange]
  )

  const getCheckedFees = useCallback(() => {
    return order?.fees ? new Set(order.fees.map((f) => f.name)) : new Set()
  }, [order?.fees])

  const checkedFees = getCheckedFees()
  const availableFees = Order.getAvailableFees(order)

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        size="small"
        className="fee-selector-trigger"
        aria-label="Manage fees"
        aria-haspopup="dialog"
      >
        Fees
      </Button>

      <Dialog
        fullScreen={isSmallScreen}
        open={openDialog}
        onClose={handleClose}
        aria-labelledby="fee-dialog-title"
        className="fee-selector-dialog"
        PaperProps={{
          className: isSmallScreen
            ? 'fee-selector-dialog-paper--mobile'
            : 'fee-selector-dialog-paper',
        }}
      >
        <DialogTitle id="fee-dialog-title" className="fee-selector-dialog-title">
          Add fees
        </DialogTitle>
        <DialogContent className="fee-selector-dialog-content">
          {availableFees.length > 0 ? (
            <FormGroup className="fee-selector-form-group">
              {availableFees.map((fee) => (
                <FormControlLabel
                  key={fee.name}
                  className="fee-selector-item"
                  label={`${fee.label} (${fee.amount}€)`}
                  control={
                    <Checkbox
                      color="primary"
                      checked={checkedFees.has(fee.name)}
                      onChange={(e) => handleFeeChange(fee, e.target.checked)}
                      inputProps={{
                        'aria-label': `Select ${fee.label} fee`,
                      }}
                    />
                  }
                />
              ))}
            </FormGroup>
          ) : (
            <p className="fee-selector-empty">No fees available for this service.</p>
          )}
        </DialogContent>
        <DialogActions className="fee-selector-dialog-actions">
          <Button
            onClick={handleClose}
            color="default"
            variant="text"
            className="fee-selector-button-close"
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
