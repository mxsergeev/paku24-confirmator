import React from 'react'
import Button from '@material-ui/core/Button'
import EventIcon from '@material-ui/icons/Event'

export default function AddToCalendarButton({
  handleClick,
  disabled,
  statusText,
}) {
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
          <span>Add</span>
          <EventIcon />
        </>
      )}
    </Button>
  )
}
