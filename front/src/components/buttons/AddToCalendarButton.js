import React from 'react'
import Button from '@material-ui/core/Button'
import EventIcon from '@material-ui/icons/Event'

export default function AddToCalendarButton({ handleClick, disabled }) {
  return (
    <Button
      disabled={disabled}
      className="button-email flex-item"
      variant="contained"
      size="small"
      onClick={handleClick}
    >
      Add to calendar <EventIcon />
    </Button>
  )
}
