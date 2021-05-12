import React from 'react'
import Button from '@material-ui/core/Button'
import NoteAddIcon from '@material-ui/icons/NoteAdd'

export default function CopyButton({ handleClick }) {
  return (
    <Button
      className="button-one-third flex-item"
      variant="contained"
      size="small"
      onClick={handleClick}
    >
      New order <NoteAddIcon />
    </Button>
  )
}
