import React from 'react'
import Button from '@material-ui/core/Button'
import '../../styles/convert.css'
import EmailIcon from '@material-ui/icons/Email'

export default function SendEmailButton({ handleClick }) {

  return (
    <Button 
      className="button-email flex-item"
      variant="contained" 
      size="small" 
      onClick={handleClick}>
        Send <EmailIcon />
    </Button>
  )
}