import React from 'react'
import { useHistory, Route } from 'react-router-dom'
import ResponsiveDialog from '../../ResponsiveDialog'
import OrderPool from './OrderPool'

export default function OrderPoolDialog({ handleExport }) {
  const history = useHistory()

  const handleClose = () => {
    history.goBack()
  }

  return (
    <>
      <Route path="/order-pool">
        <ResponsiveDialog handleClose={handleClose}>
          <OrderPool
            handleExport={(o) => {
              handleExport(o)
              handleClose()
            }}
          />
        </ResponsiveDialog>
      </Route>
    </>
  )
}
