/* eslint-disable no-param-reassign */
import React from 'react'
import { useSnackbar } from 'notistack'
import EventIcon from '@material-ui/icons/Event'
import addEventToCalendar from '../../../services/calendarAPI'
import orderPoolAPI from '../../../services/orderPoolAPI'
import Order from '../../../helpers/Order'

import CustomButton from './CustomButton'

const CALENDAR = 'calendar'

export default function AddOrderToCalendarButton({
  order,
  orderId,
  transformedOrderText,
  statusText,
  isDisabled,
  changeStatus,
  className,
}) {
  const { enqueueSnackbar } = useSnackbar()

  async function handleAddingToCalendar() {
    try {
      const entry = Order.getEventForCalendar(transformedOrderText, order.address)
      if (entry) {
        changeStatus(CALENDAR, 'Working', true)
        const response = await addEventToCalendar({
          entry,
          order,
          fees: order.fees,
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
        enqueueSnackbar(`${response.message}\n${response.createdEvent}`)
      }
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus(CALENDAR, 'Error', false)
      enqueueSnackbar(err.response?.data.error, { variant: 'error' })
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
