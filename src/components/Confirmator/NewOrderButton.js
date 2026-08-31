import React from 'react'
import Button from '@material-ui/core/Button'
import NoteAddIcon from '@material-ui/icons/NoteAdd'

export default function NewOrderButton({ handleClick, className, text = 'New order', disabled = false }) {
  return (
    <Button
      className={className}
      variant="contained"
      size="small"
      onClick={handleClick}
      disabled={disabled}
    >
      {text} <NoteAddIcon />
    </Button>
  )
}
