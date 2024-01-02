import React from 'react'
import { enqueueSnackbar } from 'notistack'
import TextsmsIcon from '@material-ui/icons/Textsms'
import sendSMS from '../../../services/smsAPI'
import CustomButton from './CustomButton'

const SMS = 'sms'

export default function ConfirmationSMSSenderButton({
  phone,
  transformedOrderText,
  statusText,
  isDisabled,
  changeStatus,
  className,
}) {
  async function handleSendingSMS() {
    try {
      const msg = transformedOrderText
      if (msg && phone) {
        changeStatus(SMS, 'Working', true)
        const response = await sendSMS({ msg, phone })
        changeStatus(SMS, 'Done', true)
        enqueueSnackbar(`${response.message}`)
      }
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus(SMS, 'Error', false)
      enqueueSnackbar(err.response?.data.error, { variant: 'error' })
    }
  }

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
