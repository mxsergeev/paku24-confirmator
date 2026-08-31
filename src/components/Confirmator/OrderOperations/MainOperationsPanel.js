import React, { useCallback, useRef, useState } from 'react'
import { Button } from '@material-ui/core'
import { enqueueSnackbar } from 'notistack'
import NewOrderButton from '../NewOrderButton'
import OrderPoolOpenerButton from '../OrderPool/OrderPoolOpenerButton'
import MessageBeforeButton from './MessageBeforeButton'
import ConfirmationEmailSenderButton from './ConfirmationEmailSenderButton'
import ConfirmationSMSSenderButton from './ConfirmationSMSSenderButton'
import AddOrderToCalendarButton from './AddOrderToCalendarButton'
import addOrderToCalendar from '../../../services/orderCalendarWorkflow'
import './OrderOperations.css'

export default function MainOperationsPanel({
  order,
  orderId,
  transformedOrder,
  handleResetClick,
  orderPoolUrl,
  hideOrderPool,
  onOrderPersisted,
  onOrderUpdated,
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
  const addingOrderRef = useRef(false)

  const changeStatus = useCallback((name, status, disable) => {
    setStatuses((prev) => ({ ...prev, [name]: { status, disable } }))
  }, [])

  const handleNewOrderWithCalendar = useCallback(async () => {
    if (addingOrderRef.current) return
    if (!transformedOrder.text) {
      enqueueSnackbar('Order is empty or not transformed', { variant: 'error' })
      return
    }

    try {
      addingOrderRef.current = true
      changeStatus('calendar', 'Working', true)
      const response = await addOrderToCalendar({
        order,
        orderId,
        onOrderPersisted,
        onOrderUpdated,
      })
      changeStatus('calendar', 'Done', true)
      enqueueSnackbar(`${response?.message}\n${response?.createdEvent}`)

      // Reset after successful calendar addition
      setStatuses(defaultStatuses)
      handleResetClick()
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus('calendar', 'Error', false)
      enqueueSnackbar(err.response?.data.error || err?.toString(), { variant: 'error' })
    } finally {
      addingOrderRef.current = false
    }
  }, [
    order,
    orderId,
    transformedOrder.text,
    changeStatus,
    handleResetClick,
    defaultStatuses,
    onOrderPersisted,
    onOrderUpdated,
  ])

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
          disabled={hideOrderPool && (statuses.calendar.disable || !transformedOrder.text)}
          handleClick={
            hideOrderPool
              ? handleNewOrderWithCalendar
              : () => {
                  setStatuses(defaultStatuses)
                  handleResetClick()
                }
          }
        />
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
            onOrderPersisted={onOrderPersisted}
            onOrderUpdated={onOrderUpdated}
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
