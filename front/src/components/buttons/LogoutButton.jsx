import React from 'react'
import Button from '@material-ui/core/Button'
import MeetingRoomIcon from '@material-ui/icons/MeetingRoom'

export default function LogoutButton({ handleClick }) {
  return (
    <Button
      style={{ backgroundColor: 'lightgrey' }}
      variant="outlined"
      size="small"
      onClick={handleClick}
    >
      Logout <MeetingRoomIcon />
    </Button>
  )
}
