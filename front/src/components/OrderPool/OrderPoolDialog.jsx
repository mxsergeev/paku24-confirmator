import React from 'react'
import { useHistory, Route } from 'react-router-dom'
import Button from '@material-ui/core/Button'
import ResponsiveDialog from '../ResponsiveDialog'
import OrderPool from './OrderPool'

export default function OrderPoolDialog({ setOrderText }) {
  const history = useHistory()

  const handleClickOpen = () => {
    history.push('/order-pool')
  }

  const handleClose = () => {
    history.goBack()
  }

  return (
    <>
      <Button
        className="button-one-third"
        variant="contained"
        onClick={handleClickOpen}
      >
        Open Order Pool
      </Button>
      <Route exact path="/order-pool">
        <ResponsiveDialog handleClose={handleClose}>
          <OrderPool setOrderText={setOrderText} handleClose={handleClose} />
        </ResponsiveDialog>
      </Route>
    </>
  )
}
