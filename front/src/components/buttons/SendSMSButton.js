import React from 'react'
import Button from '@material-ui/core/Button'
import TextsmsIcon from '@material-ui/icons/Textsms'

export default function SendSMSButton({ phoneNumber, msgBody, err, disabled }) {
  return (
    <Button
      disabled={err || disabled}
      className="button-phone flex-item"
      variant="contained"
      size="small"
    >
      <a
        className="sms"
        href={`sms://${phoneNumber}/?body=${encodeURI(msgBody)}`}
      >
        Send <TextsmsIcon className="sms-icon" />
      </a>
    </Button>
  )
}
