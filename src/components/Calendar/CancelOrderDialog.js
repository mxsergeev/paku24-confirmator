import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'

export default function CancelOrderDialog({
  open,
  onClose,
  onCancelOnly,
  onCancelAndNotify,
  canceling,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="calendar-order-dialog"
      PaperProps={{
        className: 'calendar-order-dialog-paper calendar-order-dialog-paper--narrow',
      }}
    >
      <DialogTitle className="calendar-order-dialog-title-wrap">
        <h3 className="calendar-dialog-title">Cancel this order?</h3>
      </DialogTitle>
      <DialogContent>
        <p>Are you sure you want to cancel this order?</p>
        <p className="calendar-dialog-muted-text">
          Notifications will be sent automatically to available channels (email and/or SMS).
        </p>
      </DialogContent>
      <DialogActions className="calendar-dialog-actions calendar-dialog-actions--compact">
        <Button
          onClick={onClose}
          color="default"
          disabled={canceling}
          className="calendar-dialog-button"
        >
          Keep order
        </Button>
        <Button
          onClick={onCancelOnly}
          color="secondary"
          variant="contained"
          disabled={canceling}
          className="calendar-dialog-button calendar-dialog-button--danger-fill"
        >
          {canceling ? 'Canceling...' : 'Cancel only'}
        </Button>
        <Button
          onClick={onCancelAndNotify}
          color="secondary"
          variant="contained"
          disabled={canceling}
          className="calendar-dialog-button calendar-dialog-button--danger-fill"
        >
          {canceling ? 'Canceling...' : 'Cancel & notify'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
