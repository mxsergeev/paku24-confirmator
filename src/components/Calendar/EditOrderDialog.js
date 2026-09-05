import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import OrderEditor from '../OrderEditor/OrderEditor'
import OrderSettings from '../OrderEditor/OrderSettings'

export default function EditOrderDialog({
  open,
  onClose,
  isDesktop,
  order,
  onChange,
  onOrderChange,
  onSave,
  saving,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll="body"
      fullWidth={false}
      maxWidth={false}
      className="calendar-order-dialog"
      PaperProps={
        isDesktop
          ? { className: 'calendar-order-dialog-paper calendar-new-order-dialog-paper' }
          : {
              style: {
                width: '100vw',
                maxWidth: '100vw',
                margin: 0,
                borderRadius: 16,
                minHeight: 'auto',
              },
            }
      }
    >
      <DialogTitle className="calendar-order-dialog-title-wrap">
        <h3 className="calendar-dialog-title">Edit order</h3>
        <IconButton aria-label="close" onClick={onClose} className="calendar-order-dialog-close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="calendar-new-order-dialog-content">
        <div className="calendar-new-order-dialog-content-wrap">
          <div className="calendar-new-order-flex-container">
            <OrderEditor order={order} handleChange={onChange} onOrderChange={onOrderChange} />
            {order && <OrderSettings order={order} handleChange={onChange} />}
          </div>
        </div>
      </DialogContent>
      <DialogActions className="calendar-dialog-actions">
        <Button
          variant="contained"
          color="primary"
          onClick={onSave}
          className="calendar-dialog-button"
          disabled={!order || saving}
        >
          Save changes
        </Button>
        <Button
          variant="outlined"
          color="default"
          onClick={onClose}
          className="calendar-dialog-button"
          disabled={saving}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
