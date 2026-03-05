import React from 'react'
import Button from '@material-ui/core/Button'
import NoteAddIcon from '@material-ui/icons/NoteAdd'

export default function NewOrderButton({ handleClick, className, text = 'New order' }) {
  return (
    <Button className={className} variant="contained" size="small" onClick={handleClick}>
      {text} <NoteAddIcon />
    </Button>
  )
}
