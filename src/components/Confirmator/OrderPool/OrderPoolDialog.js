import React from 'react'
import { useHistory } from 'react-router-dom'
import ResponsiveDialog from '../../ResponsiveDialog'
import OrderPool from './OrderPool'

export default function OrderPoolDialog({ handleExport, path }) {
  const history = useHistory()

  const handleClose = () => {
    history.goBack()
  }

  return (
    <>
      <ResponsiveDialog path={path}>
        <OrderPool
          handleExport={(o) => {
            handleExport(o)
            handleClose()
          }}
        />
      </ResponsiveDialog>
    </>
  )
}
