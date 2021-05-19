import React from 'react'
import { useHistory } from 'react-router-dom'
import Button from '@material-ui/core/Button'

export default function OrderPoolOpenerButton({ className }) {
  const history = useHistory()

  const handleClickOpen = () => {
    history.push('/order-pool')
  }

  return (
    <>
      <Button
        size="small"
        className={className}
        variant="contained"
        onClick={handleClickOpen}
      >
        Order Pool
      </Button>
    </>
  )
}
