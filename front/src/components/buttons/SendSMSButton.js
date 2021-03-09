import React from 'react'
import Button from '@material-ui/core/Button'
import TextsmsIcon from '@material-ui/icons/Textsms'

export default function SendSMSButton({ handleClick, disabled }) {
  return (
    <Button
      disabled={disabled}
      onClick={handleClick}
      className="button-phone flex-item"
      variant="contained"
      size="small"
    >
      Send <TextsmsIcon className="sms-icon" />
    </Button>
  )
}
