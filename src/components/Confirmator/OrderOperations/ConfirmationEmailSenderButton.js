import React, { useCallback } from 'react'
import { enqueueSnackbar } from 'notistack'

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
  const handleEmailSending = useCallback(() => {
    if (email && transformedOrderText) {
      changeStatus(EMAIL, 'Working', true)
      return sendConfirmationEmail({
        orderDetails: transformedOrderText,
        order,
        email,
      })
        .then((res) => {
          changeStatus(EMAIL, 'Done', true)
          enqueueSnackbar(res.message)
        })
        .catch((err) => {
          if (err.message === 'logout') return
          changeStatus(EMAIL, 'Error', false)
          enqueueSnackbar(err.response.data.error, { variant: 'error' })
        })
    }
    return enqueueSnackbar('No confirmation found or recipients defined.', {
      variant: 'warning',
    })
  }, [email, order, transformedOrderText, changeStatus])

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
