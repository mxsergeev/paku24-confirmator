/* eslint-disable no-param-reassign */
import React, { useCallback } from 'react'
import { enqueueSnackbar } from 'notistack'
import EventIcon from '@material-ui/icons/Event'
import addEventToCalendar from '../../../services/calendarAPI'
import orderPoolAPI from '../../../services/orderPoolAPI'

import CustomButton from './CustomButton'

const CALENDAR = 'calendar'

export default function AddOrderToCalendarButton({
  order,
  orderId,
  statusText,
  isDisabled,
  changeStatus,
  className,
}) {
  const handleAddingToCalendar = useCallback(async () => {
    try {
      changeStatus(CALENDAR, 'Working', true)
      const response = await addEventToCalendar({
        order: order.prepareForSending(),
      })
      let oId = orderId

      if (!oId) {
        const { id } = await orderPoolAPI.add({
          order: JSON.stringify(order.prepareForSending()),
          key: 'supersecretorderpoolkey',
        })
        oId = id
      }
      await orderPoolAPI.confirm(oId)
      changeStatus(CALENDAR, 'Done', true)
      enqueueSnackbar(`${response?.message}\n${response?.createdEvent}`)
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus(CALENDAR, 'Error', false)
      enqueueSnackbar(err.response?.data.error || err?.toString(), { variant: 'error' })
    }
  }, [order, orderId, changeStatus])

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
