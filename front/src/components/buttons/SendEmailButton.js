import React from 'react'
import Button from '@material-ui/core/Button'
import EmailIcon from '@material-ui/icons/Email'

export default function SendEmailButton({ handleClick, disabled }) {
  return (
    <Button
      disabled={disabled}
      className="button-email flex-item"
      variant="contained"
      size="small"
      onClick={handleClick}
    >
      Send <EmailIcon />
    </Button>
  )
}
