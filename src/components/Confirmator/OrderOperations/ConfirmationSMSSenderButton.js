import React, { useCallback } from 'react'
import { enqueueSnackbar } from 'notistack'
import TextsmsIcon from '@material-ui/icons/Textsms'
import sendSMS, { sendCancellationSMS } from '../../../services/smsAPI'
import CustomButton from './CustomButton'
import { isCanceled, isDeleted } from '../../../shared/orderState.helpers'
import { toCommunicationOrder } from '../../../shared/orderSerialization'

const SMS = 'sms'

export default function ConfirmationSMSSenderButton({
  order,
  statusText,
  isDisabled,
  changeStatus,
  className,
}) {
  const handleSendingSMS = useCallback(async () => {
    try {
      if (isDeleted(order)) {
        enqueueSnackbar('Deleted orders cannot send messages.', { variant: 'warning' })
        return
      }
      if (order.phone) {
        changeStatus(SMS, 'Working', true)
        const canceled = isCanceled(order)
        const communicationOrder = toCommunicationOrder(order)
        const response = canceled
          ? await sendCancellationSMS({ order: communicationOrder })
          : await sendSMS({ order: communicationOrder })
        changeStatus(SMS, 'Done', true)
        enqueueSnackbar(`${response.message}`)
      }
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus(SMS, 'Error', false)
      enqueueSnackbar(err.response?.data.error, { variant: 'error' })
    }
  }, [order, changeStatus])

  const buttonContent = statusText || (
    <>
      <span>Send</span> <TextsmsIcon />
    </>
  )

  return (
    <CustomButton
      className={className}
      isDisabled={isDisabled}
      grayScale={statusText !== null}
      handleClick={handleSendingSMS}
      content={buttonContent}
    />
  )
}
