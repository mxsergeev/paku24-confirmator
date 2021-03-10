import React from 'react'
import Button from '@material-ui/core/Button'
import EmailIcon from '@material-ui/icons/Email'

export default function SendEmailButton({ handleClick, disabled, statusText }) {
  return (
    <Button
      disabled={disabled}
      className="button-email flex-item"
      variant="contained"
      size="small"
      onClick={handleClick}
    >
      {statusText ? (
        <span style={{ color: 'grey' }}>{statusText}</span>
      ) : (
        <>
          <span>Send</span>
          <EmailIcon />
        </>
      )}
    </Button>
  )
}
