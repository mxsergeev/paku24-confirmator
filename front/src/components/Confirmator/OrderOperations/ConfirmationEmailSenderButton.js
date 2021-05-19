import React from 'react'
import Toast from 'light-toast'
import EmailIcon from '@material-ui/icons/Email'
import CustomButton from './CustomButton'
import sendConfirmationEmail from '../../../services/emailAPI'

const EMAIL = 'email'

export default function ConfirmationEmailSenderButton({
  email,
  order,
  transformedOrderText,
  statusText,
  isDisabled,
  changeStatus,
  className,
}) {
  function handleEmailSending() {
    if (email && transformedOrderText) {
      changeStatus(EMAIL, 'Working', true)
      return sendConfirmationEmail({
        orderDetails: transformedOrderText,
        order,
        email,
      })
        .then((res) => {
          changeStatus(EMAIL, 'Done', true)
          Toast.info(res.message, 500)
        })
        .catch((err) => {
          changeStatus(EMAIL, 'Error', false)
          Toast.fail(err.response.data.error)
        })
    }
    return Toast.fail('No confirmation found or recipients defined.', 1000)
  }

  const buttonContent = statusText || (
    <>
      <span>Send</span> <EmailIcon />
    </>
  )

  return (
    <CustomButton
      className={className}
      isDisabled={isDisabled}
      grayScale={statusText !== null}
      handleClick={handleEmailSending}
      content={buttonContent}
    />
  )
}
