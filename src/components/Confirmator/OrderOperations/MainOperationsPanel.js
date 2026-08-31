import React, { useCallback, useRef, useState } from 'react'
import { enqueueSnackbar } from 'notistack'
import NewOrderButton from '../NewOrderButton'
import MessageBeforeButton from './MessageBeforeButton'
import ConfirmationEmailSenderButton from './ConfirmationEmailSenderButton'
import ConfirmationSMSSenderButton from './ConfirmationSMSSenderButton'
import addOrderToCalendar from '../../../services/orderCalendarWorkflow'
import { isDeleted } from '../../../shared/orderState.helpers'
import './OrderOperations.css'

export default function MainOperationsPanel({
  order,
  orderId,
  transformedOrder,
  handleResetClick,
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
    if (!transformedOrder.text || isDeleted(order)) {
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
      const hasWarning = Boolean(response?.warning)
      changeStatus('calendar', hasWarning ? 'Warning' : 'Done', !hasWarning)
      const message = [response?.message, response?.createdEvent].filter(Boolean).join('\n')
      if (message) enqueueSnackbar(message)
      if (response?.warning?.message) {
        enqueueSnackbar(response.warning.message, { variant: 'warning' })
      }

      // Reset only after the complete operation succeeds. A warning means the
      // Mongo edit was saved but calendar reconciliation still needs a retry.
      if (!hasWarning) {
        setStatuses(defaultStatuses)
        handleResetClick()
      }
    } catch (err) {
      if (err.message === 'logout') return
      changeStatus('calendar', 'Error', false)
      enqueueSnackbar(err.response?.data?.error || err?.message || err?.toString(), { variant: 'error' })
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
    const isDisabled = statuses.email.disable || isDeleted(order) || !(order.email && transformedOrder.text)
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
    const isDisabled = statuses.sms.disable || isDeleted(order) || !(order.phone && transformedOrder.text)
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

  function calendarBlock() {
    const isDisabled = statuses.calendar.disable || !transformedOrder.text || isDeleted(order)
    return (
      <div className="block">
        <NewOrderButton
          className="share-space"
          text="Add order"
          disabled={isDisabled}
          handleClick={handleNewOrderWithCalendar}
        />
      </div>
    )
  }

  return (
    <div className="order-operations">
      {emailBlock()}
      {smsBlock()}
      {calendarBlock()}
    </div>
  )
}
