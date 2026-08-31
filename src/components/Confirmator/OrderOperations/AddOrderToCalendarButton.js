/* eslint-disable no-param-reassign */
import React, { useCallback } from 'react'
import { enqueueSnackbar } from 'notistack'
import EventIcon from '@material-ui/icons/Event'
import addOrderToCalendar from '../../../services/orderCalendarWorkflow'
import { isDeleted } from '../../../shared/orderState.helpers'

import CustomButton from './CustomButton'

const CALENDAR = 'calendar'

export default function AddOrderToCalendarButton({
  order,
  orderId,
  statusText,
  isDisabled,
  changeStatus,
  onOrderPersisted,
  onOrderUpdated,
  className,
}) {
  const handleAddingToCalendar = useCallback(async () => {
    try {
      if (isDeleted(order)) {
        throw new Error('Deleted orders cannot be synchronized to calendar.')
      }
      changeStatus(CALENDAR, 'Working', true)
      const response = await addOrderToCalendar({ order, orderId, onOrderPersisted, onOrderUpdated })
      changeStatus(CALENDAR, 'Done', true)
      enqueueSnackbar(`${response?.message}\n${response?.createdEvent}`)
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus(CALENDAR, 'Error', false)
      enqueueSnackbar(err.response?.data?.error || err?.message || err?.toString(), { variant: 'error' })
    }
  }, [order, orderId, changeStatus, onOrderPersisted, onOrderUpdated])

  const buttonContent = statusText || (
    <>
      <span>Add</span> <EventIcon />
    </>
  )

  return (
    <CustomButton
      className={className}
      isDisabled={isDisabled}
      grayScale={statusText !== null}
      handleClick={handleAddingToCalendar}
      content={buttonContent}
    />
  )
}
