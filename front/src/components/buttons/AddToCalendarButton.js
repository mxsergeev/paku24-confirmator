import React from 'react'
import Button from '@material-ui/core/Button'
import '../../styles/convert.css'
import EventIcon from '@material-ui/icons/Event'

export default function SendEmailButton({ handleClick }) {

  return (
    <Button 
      className="button-email flex-item"
      variant="contained" 
      size="small" 
      onClick={handleClick}>
        Add to calendar <EventIcon />
    </Button>
  )
}