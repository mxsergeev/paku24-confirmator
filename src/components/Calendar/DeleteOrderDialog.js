import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'

export default function DeleteOrderDialog({
  open,
  onClose,
  deleteMode,
  onConfirm,
  deleting,
}) {
  const permanently = deleteMode === 'permanent'

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
        <h3 className="calendar-dialog-title">
          {permanently ? 'Delete permanently?' : 'Delete this order?'}
        </h3>
      </DialogTitle>
      <DialogContent>
        {permanently ? (
          <>
            <p>This will permanently remove the order from the database.</p>
            <p className="calendar-dialog-muted-text">This action cannot be undone.</p>
          </>
        ) : (
          <>
            <p>This will remove the order from active planning.</p>
            <p className="calendar-dialog-muted-text">
              You can still restore it later from deleted orders.
            </p>
          </>
        )}
      </DialogContent>
      <DialogActions className="calendar-dialog-actions calendar-dialog-actions--compact">
        <Button
          onClick={onClose}
          color="default"
          disabled={deleting}
          className="calendar-dialog-button"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="secondary"
          variant="contained"
          disabled={deleting}
          className="calendar-dialog-button calendar-dialog-button--danger-fill"
        >
          {deleting ? 'Deleting...' : permanently ? 'Delete permanently' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
