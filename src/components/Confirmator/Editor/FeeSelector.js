import React, { useState } from 'react'
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

import Order from '../../../shared/Order'

export default function FeeSelector({ order, onChange }) {
  const [openDialog, setOpenDialog] = useState(false)
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const handleOpen = () => setOpenDialog(true)
  const handleClose = () => setOpenDialog(false)

  return (
    <>
      <Button onClick={handleOpen}>Fees</Button>

      <Dialog
        fullScreen={fullScreen}
        open={openDialog}
        onClose={handleClose}
        aria-labelledby="fee-dialog-title"
      >
        <DialogTitle id="fee-dialog-title">Select Fees</DialogTitle>
        <DialogContent>
          <FormGroup>
            {Order.getAvailableFees(order).map((fee) => (
              <FormControlLabel
                key={fee.name}
                label={`${fee.label} (${fee.amount}€)`}
                control={
                  <Checkbox
                    color="primary"
                    checked={
                      order?.fees
                        ? order.fees.find((f) => f.name === fee.name) !== undefined
                        : false
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newManual = order?.fees ? order.fees.concat(fee) : [fee]
                        onChange(newManual)
                        return
                      }

                      if (!order?.fees) return
                      onChange(order.fees.filter((f) => f.name !== fee.name))
                    }}
                  />
                }
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button style={{ backgroundColor: 'white' }} variant="text" onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
