import React from 'react'
import ResponsiveDialog from '../../ResponsiveDialog'
import OrderPool from './OrderPool'

export default function OrderPoolDialog({ handleExport, path }) {
  return (
    <ResponsiveDialog path={path}>
      <OrderPool handleExport={handleExport} />
    </ResponsiveDialog>
  )
}
