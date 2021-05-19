import React from 'react'
import Toast from 'light-toast'
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
        if (orderId) await orderPoolAPI.confirm(orderId)
        changeStatus(CALENDAR, 'Done', true)
        Toast.info(`${response.message}\n${response.createdEvent}`, 3000)
      }
    } catch (err) {
      changeStatus(CALENDAR, 'Error', false)
      Toast.fail(err.response?.data.error, 2000)
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
