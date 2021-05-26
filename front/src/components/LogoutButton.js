import React from 'react'
import Button from '@material-ui/core/Button'
import ExitToAppIcon from '@material-ui/icons/ExitToApp'

export default function LogoutButton({ handleClick }) {
  return (
    <Button
      style={{ backgroundColor: 'lightgrey' }}
      variant="outlined"
      size="small"
      onClick={handleClick}
    >
      Logout <ExitToAppIcon />
    </Button>
  )
}
