import React, { useCallback, useState } from 'react'
import { Button } from '@material-ui/core'
import { enqueueSnackbar } from 'notistack'
import NewOrderButton from '../NewOrderButton'
import OrderPoolOpenerButton from '../OrderPool/OrderPoolOpenerButton'
import MessageBeforeButton from './MessageBeforeButton'
import ConfirmationEmailSenderButton from './ConfirmationEmailSenderButton'
import ConfirmationSMSSenderButton from './ConfirmationSMSSenderButton'
import AddOrderToCalendarButton from './AddOrderToCalendarButton'
import addEventToCalendar from '../../../services/calendarAPI'
import orderPoolAPI from '../../../services/orderPoolAPI'
import './OrderOperations.css'

export default function MainOperationsPanel({
  order,
  orderId,
  transformedOrder,
  handleResetClick,
  orderPoolUrl,
  hideOrderPool,
  onClear,
}) {
  const defaultStatuses = {
    email: {
      status: null,
      disable: false,
    },
    sms: {
      status: null,
      disable: false,
    },
    calendar: {
      status: null,
      disable: false,
    },
  }
  const [statuses, setStatuses] = useState(defaultStatuses)

  const changeStatus = useCallback((name, status, disable) => {
    setStatuses((prev) => ({ ...prev, [name]: { status, disable } }))
  }, [])

  const handleNewOrderWithCalendar = useCallback(async () => {
    if (!transformedOrder.text) {
      enqueueSnackbar('Order is empty or not transformed', { variant: 'error' })
      return
    }

    try {
      changeStatus('calendar', 'Working', true)
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
      changeStatus('calendar', 'Done', true)
      enqueueSnackbar(`${response?.message}\n${response?.createdEvent}`)

      // Reset after successful calendar addition
      setStatuses(defaultStatuses)
      handleResetClick()
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus('calendar', 'Error', false)
      enqueueSnackbar(err.response?.data.error || err?.toString(), { variant: 'error' })
    }
  }, [order, orderId, transformedOrder.text, changeStatus, handleResetClick, defaultStatuses])

  function emailBlock() {
    const isDisabled = statuses.email.disable || !(order.email && transformedOrder.text)
    return (
      <div className="block">
        <MessageBeforeButton
          className={`width-75 ${isDisabled && 'grayedFont'}`}
          text={`Email to: ${order.email}`}
        />
        <ConfirmationEmailSenderButton
          className="width-25"
          email={order.email}
          order={order}
          statusText={statuses.email.status}
          isDisabled={isDisabled}
          transformedOrderText={transformedOrder.text}
          changeStatus={changeStatus}
        />
      </div>
    )
  }

  function smsBlock() {
    const isDisabled = statuses.sms.disable || !(order.phone && transformedOrder.text)
    return (
      <div className="block">
        <MessageBeforeButton
          className={`width-75 ${isDisabled && 'grayedFont'}`}
          text={`Sms to: ${order.phone}`}
        />
        <ConfirmationSMSSenderButton
          className="width-25"
          order={order}
          statusText={statuses.sms.status}
          isDisabled={isDisabled}
          changeStatus={changeStatus}
        />
      </div>
    )
  }

  function threeButtonsBlock() {
    const isDisabled = statuses.calendar.disable || !transformedOrder.text
    return (
      <div className="block">
        <NewOrderButton
          className="share-space"
          text={hideOrderPool ? 'Add order' : 'New order'}
          handleClick={
            hideOrderPool
              ? handleNewOrderWithCalendar
              : () => {
                  setStatuses(defaultStatuses)
                  handleResetClick()
                }
          }
        />
        {hideOrderPool && (
          <Button
            className="width-25"
            variant="outlined"
            size="small"
            onClick={() => {
              setStatuses(defaultStatuses)
              onClear && onClear()
            }}
          >
            Clear
          </Button>
        )}
        {!hideOrderPool && (
          <OrderPoolOpenerButton className="share-space" orderPoolUrl={orderPoolUrl} />
        )}
        {!hideOrderPool && (
          <AddOrderToCalendarButton
            className="width-25"
            statusText={statuses.calendar.status}
            isDisabled={isDisabled}
            order={order}
            orderId={orderId}
            transformedOrderText={transformedOrder.text}
            changeStatus={changeStatus}
          />
        )}
      </div>
    )
  }

  return (
    <div className="order-operations">
      {emailBlock()}
      {smsBlock()}
      {threeButtonsBlock()}
    </div>
  )
}
