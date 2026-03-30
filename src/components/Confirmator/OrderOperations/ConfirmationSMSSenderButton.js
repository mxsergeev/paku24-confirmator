import React, { useCallback } from 'react'
import { enqueueSnackbar } from 'notistack'
import TextsmsIcon from '@material-ui/icons/Textsms'
import sendSMS, { sendCancellationSMS } from '../../../services/smsAPI'
import CustomButton from './CustomButton'

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
      if (order.phone) {
        changeStatus(SMS, 'Working', true)
        const isCanceled = Boolean(order?.canceledAt)
        const response = isCanceled
          ? await sendCancellationSMS({ order: order.prepareForSending() })
          : await sendSMS({ order: order.prepareForSending() })
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
