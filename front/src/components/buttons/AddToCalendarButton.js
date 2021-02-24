import React from 'react'
import Button from '@material-ui/core/Button'
import EventIcon from '@material-ui/icons/Event'

export default function SendEmailButton({ handleClick, err }) {
  return (
    <Button
      disabled={err}
      className="button-email flex-item"
      variant="contained"
      size="small"
      onClick={handleClick}
    >
      Add to calendar <EventIcon />
    </Button>
  )
}
