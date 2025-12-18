import React, { useCallback, useState } from 'react'
import NewOrderButton from '../NewOrderButton'
import OrderPoolOpenerButton from '../OrderPool/OrderPoolOpenerButton'
import MessageBeforeButton from './MessageBeforeButton'
import ConfirmationEmailSenderButton from './ConfirmationEmailSenderButton'
import ConfirmationSMSSenderButton from './ConfirmationSMSSenderButton'
import AddOrderToCalendarButton from './AddOrderToCalendarButton'
import './OrderOperations.css'

export default function MainOperationsPanel({
  order,
  orderId,
  transformedOrder,
  handleResetClick,
  orderPoolUrl,
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
          handleClick={() => {
            setStatuses(defaultStatuses)
            handleResetClick()
          }}
        />
        <OrderPoolOpenerButton className="share-space" orderPoolUrl={orderPoolUrl} />
        <AddOrderToCalendarButton
          className="width-25"
          statusText={statuses.calendar.status}
          isDisabled={isDisabled}
          order={order}
          orderId={orderId}
          transformedOrderText={transformedOrder.text}
          changeStatus={changeStatus}
        />
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
