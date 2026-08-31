import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from '@material-ui/core'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import CloseIcon from '@material-ui/icons/Close'
import EmailIcon from '@material-ui/icons/Email'
import TextsmsIcon from '@material-ui/icons/Textsms'
import EditIcon from '@material-ui/icons/Edit'
import DeleteIcon from '@material-ui/icons/Delete'
import CheckIcon from '@material-ui/icons/Check'
import './Calendar.css'
import { getOrderIcons, parseBoxEventId, getBoxEventTitle } from './helpers'
import Editor from '../Confirmator/Editor'
import OrderSettings from '../Confirmator/OrderSettings'
import OrderDialogDetails from './OrderDialogDetails'
import ReceiptEditDialog from './ReceiptEditDialog'
import iconsData from '../../data/icons.json'
import colors from '../../shared/colors'
import { hydrateCanonicalOrder } from '../../shared/orderModel'
import { isCanceled, isDeleted, isConfirmed } from '../../shared/orderState.helpers'
import { hexToRgba } from '../../shared/color.helpers'
import useOrderDialogActions from './useOrderDialogActions'
import useOrderDialogEventColor from './useOrderDialogEventColor'
import useOrderDialogReceipt from './useOrderDialogReceipt'
import {
  formatHelsinkiInstant,
  isDateOnly,
  parseCalendarDate,
} from '../../shared/date-fns-tz'

const DOCUMENT_TYPES = {
  RECEIPT: 'receipt',
  INVOICE: 'invoice',
}

function formatDialogEventTime(value, fieldName) {
  if (!value) return ''
  if (isDateOnly(value)) {
    parseCalendarDate(value, fieldName)
    return ''
  }

  return formatHelsinkiInstant(value, 'HH:mm', fieldName)
}

export default function OrderDialog({
  onClose,
  eventId,
  order: incomingOrder = null,
  onOrderUpdate,
}) {
  const [order, setOrder] = useState(null)

  const { orderId, eventType } = parseBoxEventId(eventId)
  const isDesktop = useMediaQuery('(min-width:601px)')

  useEffect(() => {
    setOrder(incomingOrder ? hydrateCanonicalOrder(incomingOrder) : null)
  }, [incomingOrder])

  const actions = useOrderDialogActions({
    order,
    orderId,
    setOrder,
    onOrderUpdate,
    onClose,
  })
  const { changingEventColor, onEventColorChange } = useOrderDialogEventColor({
    order,
    orderId,
    setOrder,
  })
  const receipt = useOrderDialogReceipt({ order, orderId })

  const {
    cancelConfirmOpen,
    canceling,
    confirmDialogOpen,
    deleting,
    deleteConfirmOpen,
    deleteMode,
    editOpen,
    editableOrder,
    handleCancelAndNotify,
    handleCancelConfirmClose,
    handleCancelConfirmDirect,
    handleCancelConfirmOpen,
    handleConfirm,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteConfirmClose,
    handleEdit,
    handleEditChange,
    handleEditClose,
    handleRevertEdit,
    handleRestore,
    handleSaveChanges,
    handleSendEmail,
    handleSendSMS,
    revertingEdit,
    savingEdit,
    sendingEmail,
    sendingSMS,
    setEditableOrder,
    setConfirmDialogOpen,
  } = actions
  const {
    handleReceiptClose,
    handleReceiptOpen,
    handleReceiptPageOpen,
    receiptDocumentType,
    receiptDraft,
    receiptOpen,
  } = receipt

  const title = order
    ? eventType === 'boxDelivery'
      ? getBoxEventTitle(
          order,
          'boxDelivery',
          formatDialogEventTime(order.boxes?.deliveryDate, 'box delivery date'),
          iconsData
        )
      : eventType === 'boxReturn'
      ? getBoxEventTitle(
          order,
          'boxReturn',
          formatDialogEventTime(order.boxes?.returnDate, 'box return date'),
          iconsData
        )
      : `${getOrderIcons(order, iconsData)} ${formatDialogEventTime(order.date, 'order date')}(${order.duration}h) ${order.name}`
    : 'Order not found in this calendar view'

  const isConfirmedOrder = isConfirmed(order)
  const isDeletedOrder = isDeleted(order)

  const isCanceledOrder = isCanceled(order)

  let headerBg = '#3937375d'
  if (!isDeletedOrder) {
    headerBg = '#dedddd'
    if (isConfirmedOrder) {
      headerBg = isCanceledOrder
        ? '#616161'
        : hexToRgba(
            colors[String(order?.eventColor ?? '')]?.hex || colors['7']?.hex || '#039be5',
            0.62,
          )
    }
  }

  const titleWithStatus = `${title}${
    isDeletedOrder ? ' (DELETED)' : isCanceledOrder ? ' (CANCELED)' : ''
  }`

  if (!eventId) {
    return null
  }

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        fullWidth={isDesktop}
        maxWidth={isDesktop ? 'sm' : false}
        className="calendar-order-dialog"
        PaperProps={
          isDesktop
            ? { className: 'calendar-order-dialog-paper calendar-order-dialog-paper--no-border' }
            : {
                style: {
                  width: '100vw',
                  maxWidth: '100vw',
                  margin: 0,
                  borderRadius: 16,
                  minHeight: 'auto',
                  border: 'none',
                },
              }
        }
      >
        <DialogTitle className="calendar-order-dialog-title-wrap" style={{ background: headerBg }}>
          <h3 className="calendar-dialog-title">
            {isDeletedOrder ? (
              <span className="calendar-dialog-title-icon calendar-dialog-title-icon--deleted">
                ❗️
              </span>
            ) : !isConfirmedOrder ? (
              <span className="calendar-dialog-title-icon calendar-dialog-title-icon--unconfirmed">
                ❓
              </span>
            ) : null}
            {titleWithStatus}
          </h3>
          <IconButton aria-label="close" onClick={onClose} className="calendar-order-dialog-close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="calendar-dialog-details-content">
          <OrderDialogDetails
            order={order}
            eventType={eventType}
            onEventColorChange={onEventColorChange}
            changingEventColor={changingEventColor}
          />
        </DialogContent>
        <DialogActions className="calendar-dialog-actions">
          {!isCanceledOrder && !isDeletedOrder && isConfirmedOrder && (
            <div className="calendar-dialog-actions-group">
              <Button
                variant="contained"
                color="primary"
                startIcon={<EmailIcon />}
                onClick={handleSendEmail}
                disabled={!order || !order.email || sendingEmail}
                className="calendar-dialog-button calendar-dialog-button--accent"
              >
                {sendingEmail ? 'Sending...' : 'Send email'}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<TextsmsIcon />}
                onClick={handleSendSMS}
                disabled={!order || !order.phone || sendingSMS}
                className="calendar-dialog-button calendar-dialog-button--accent"
              >
                {sendingSMS ? 'Sending...' : 'Send SMS'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleReceiptOpen(DOCUMENT_TYPES.RECEIPT)}
                disabled={!order}
                className={`calendar-dialog-button calendar-dialog-button--document ${
                  receiptDocumentType === DOCUMENT_TYPES.RECEIPT
                    ? 'calendar-dialog-button--document-active'
                    : ''
                }`}
              >
                Create receipt
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleReceiptOpen(DOCUMENT_TYPES.INVOICE)}
                disabled={!order}
                className={`calendar-dialog-button calendar-dialog-button--document ${
                  receiptDocumentType === DOCUMENT_TYPES.INVOICE
                    ? 'calendar-dialog-button--document-active'
                    : ''
                }`}
              >
                Create invoice
              </Button>
            </div>
          )}
          <div className="calendar-dialog-actions-secondary">
            {!isConfirmedOrder && !isDeletedOrder && (
              <Button
                variant="text"
                color="default"
                disabled={!order}
                startIcon={<CheckIcon />}
                className="calendar-dialog-button"
                onClick={() => setConfirmDialogOpen(true)}
              >
                Confirm order
              </Button>
            )}
            {!isCanceledOrder && !isDeletedOrder && (
              <Button
                variant="text"
                color="default"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                disabled={!order}
                className="calendar-dialog-button calendar-dialog-button--quiet"
              >
                Edit
              </Button>
            )}
            {(isCanceledOrder || isDeletedOrder) && (
              <Button
                variant="text"
                color="default"
                startIcon={<CheckIcon />}
                onClick={handleRestore}
                disabled={!order}
                className="calendar-dialog-button calendar-dialog-button--quiet"
              >
                Restore
              </Button>
            )}
            {(!isConfirmedOrder || isCanceledOrder) && (
              <Button
                variant="text"
                color="secondary"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
                disabled={!order}
                className="calendar-dialog-button calendar-dialog-button--danger"
              >
                {isDeletedOrder ? 'Delete permanently' : 'Delete'}
              </Button>
            )}
            {isConfirmedOrder && !isCanceledOrder && (
              <Button
                variant="text"
                color="secondary"
                startIcon={<DeleteIcon />}
                onClick={handleCancelConfirmOpen}
                disabled={!order || canceling}
                className="calendar-dialog-button calendar-dialog-button--danger"
              >
                {canceling ? 'Canceling...' : 'Cancel order'}
              </Button>
            )}
          </div>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        className="calendar-order-dialog"
      >
        <DialogTitle>Confirm Order</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to confirm this order?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="default">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <ReceiptEditDialog
        open={receiptOpen}
        onClose={handleReceiptClose}
        onOpenReceiptPage={handleReceiptPageOpen}
        order={order}
        initialDraft={receiptDraft}
      />
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
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
          <IconButton
            aria-label="close"
            onClick={handleEditClose}
            className="calendar-order-dialog-close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className="calendar-new-order-dialog-content">
          <div className="calendar-new-order-dialog-content-wrap">
            <div className="calendar-new-order-flex-container">
              <Editor
                order={editableOrder}
                handleChange={handleEditChange}
                onOrderChange={setEditableOrder}
                onRevert={handleRevertEdit}
                reverting={revertingEdit}
              />
              {editableOrder && (
                <OrderSettings order={editableOrder} handleChange={handleEditChange} />
              )}
            </div>
          </div>
        </DialogContent>
        <DialogActions className="calendar-dialog-actions">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveChanges}
            className="calendar-dialog-button"
            disabled={!editableOrder || savingEdit || revertingEdit}
          >
            Save changes
          </Button>
          <Button
            variant="outlined"
            color="default"
            onClick={handleEditClose}
            className="calendar-dialog-button"
            disabled={savingEdit || revertingEdit}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteConfirmClose}
        className="calendar-order-dialog"
        PaperProps={{
          className: 'calendar-order-dialog-paper calendar-order-dialog-paper--narrow',
        }}
      >
        <DialogTitle className="calendar-order-dialog-title-wrap">
          <h3 className="calendar-dialog-title">
            {deleteMode === 'permanent' ? 'Delete permanently?' : 'Delete this order?'}
          </h3>
        </DialogTitle>
        <DialogContent>
          {deleteMode === 'permanent' ? (
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
            onClick={handleDeleteConfirmClose}
            color="default"
            disabled={deleting}
            className="calendar-dialog-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="secondary"
            variant="contained"
            disabled={deleting}
            className="calendar-dialog-button calendar-dialog-button--danger-fill"
          >
            {deleting
              ? 'Deleting...'
              : deleteMode === 'permanent'
              ? 'Delete permanently'
              : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={cancelConfirmOpen}
        onClose={handleCancelConfirmClose}
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
          <>
            <Button
              onClick={handleCancelConfirmClose}
              color="default"
              disabled={canceling}
              className="calendar-dialog-button"
            >
              Keep order
            </Button>
            <Button
              onClick={handleCancelConfirmDirect}
              color="secondary"
              variant="contained"
              disabled={canceling}
              className="calendar-dialog-button calendar-dialog-button--danger-fill"
            >
              {canceling ? 'Canceling...' : 'Cancel only'}
            </Button>
            <Button
              onClick={handleCancelAndNotify}
              color="secondary"
              variant="contained"
              disabled={canceling}
              className="calendar-dialog-button calendar-dialog-button--danger-fill"
            >
              {canceling ? 'Canceling...' : 'Cancel & notify'}
            </Button>
          </>
        </DialogActions>
      </Dialog>
    </>
  )
}
