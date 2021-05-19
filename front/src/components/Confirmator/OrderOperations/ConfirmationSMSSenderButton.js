import React from 'react'
import Toast from 'light-toast'
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
        Toast.info(`${response.message}`, 500)
      }
    } catch (err) {
      changeStatus(SMS, 'Error', false)
      Toast.fail(err.response?.data.error, 2000)
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
