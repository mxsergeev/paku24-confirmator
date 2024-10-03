import React from 'react'
import Button from '@material-ui/core/Button'
import NoteAddIcon from '@material-ui/icons/NoteAdd'

export default function NewOrderButton({ handleClick, className }) {
  return (
    <Button className={className} variant="contained" size="small" onClick={handleClick}>
      New order <NoteAddIcon />
    </Button>
  )
}
