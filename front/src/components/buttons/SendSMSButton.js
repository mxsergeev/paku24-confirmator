import React from 'react'
import Button from '@material-ui/core/Button'
import '../../styles/convert.css'
import TextsmsIcon from '@material-ui/icons/Textsms'

export default function SendSMSButton({ phoneNumber, msgBody }) {

  return (
    <Button
      className="button-phone flex-item" 
      variant="contained" 
      size="small"
    > 
      <a className="" href={`sms://${phoneNumber}/?body=${encodeURI(msgBody)}`}>
        Send <TextsmsIcon className="sms-icon"/>             
      </a>
    </Button>
  )
}