/* eslint-disable no-param-reassign */
import React from 'react'
import { useSnackbar } from 'notistack'
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
  const { enqueueSnackbar } = useSnackbar()

  async function handleAddingToCalendar() {
    try {
      changeStatus(CALENDAR, 'Working', true)
      const response = await addEventToCalendar({
        order,
        calendarEntries: order.makeCalendarEntries(),
      })
      if (!orderId) {
        const { id } = await orderPoolAPI.add({
          order: order.prepareForSending(),
          key: 'supersecretorderpoolkey',
        })
        orderId = id
      }
      await orderPoolAPI.confirm(orderId)
      changeStatus(CALENDAR, 'Done', true)
      enqueueSnackbar(`${response?.message}\n${response?.createdEvent}`)
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus(CALENDAR, 'Error', false)
      enqueueSnackbar(err.response?.data.error || err?.toString(), { variant: 'error' })
    }
  }

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
