import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import OrderDialog from './OrderDialog'
import NewOrderDialog from './NewOrderDialog'
import ReceiptPage from './ReceiptPage'
import dayjs from 'dayjs'
import { getOrderIcons, getBoxEventTitle, parseBoxEventId } from './helpers'
import colorsData from './calendar.data.colors.json'
import calendarColors from '../../data/colors.json'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import multiMonthPlugin from '@fullcalendar/multimonth'
import iconsData from '../../data/icons.json'
import { useCalendarOrders } from '../../hooks/useCalendarOrders'
import './Calendar.css'

export default function Calendar() {
  const calendarRef = useRef(null)
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null,
  })
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const history = useHistory()
  const location = useLocation()
  const match = useRouteMatch()
  const orderRouteMatch = useRouteMatch(`${match.path}/order/:orderId`)
  const receiptRouteMatch = useRouteMatch(`${match.path}/receipt/:orderId`)
  const queryClient = useQueryClient()
  const isMobile = window.innerWidth <= 600
  const mobileCalendarProps = isMobile
    ? {
        slotMinTime: '00:00:00',
        slotMaxTime: '24:00:00',
      }
    : {}
  const views = {
    timeGridWeek: {
      height: 'auto',
      contentHeight: 'auto',
      expandRows: false,
    },
    listWeek: {
      height: 'auto',
      contentHeight: 'auto',
    },
    multiMonthYear: {
      height: 'auto',
      contentHeight: 'auto',
    },
    ...(isMobile
      ? {
          dayGridMonth: {
            height: '95dvh',
            contentHeight: '100%',
            expandRows: true,
          },
        }
      : {}),
  }

  // Set initial date range after calendar API is available
  useEffect(() => {
    const api = calendarRef.current?.getApi?.()
    if (!api) return

    const view = api.view
    if (!view) return

    setDateRange({
      from: view.activeStart.toISOString(),
      to: view.activeEnd.toISOString(),
    })
  }, [])

  const { data: orders = [], refetch, isLoading, isFetching, isError, error } = useCalendarOrders({
    from: dateRange?.from,
    to: dateRange?.to,
    deleted: false,
  })
  const hasDateRange = Boolean(dateRange?.from && dateRange?.to)
  const isInitialLoading = hasDateRange && isLoading
  const isRefreshing = hasDateRange && isFetching && !isLoading
  const hasNoOrders = hasDateRange && !isInitialLoading && !isError && orders.length === 0
  const errorMessage =
    error?.response?.data?.error || error?.message || 'We could not load orders for this period.'
  const selectedOrderId = orderRouteMatch?.params?.orderId || null
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId || !orders.length) return null
    const { orderId: realOrderId } = parseBoxEventId(selectedOrderId)
    return orders.find((order) => String(order.id) === String(realOrderId)) || null
  }, [selectedOrderId, orders])

  const events = useMemo(() => {
    if (!orders?.length) return []

    return orders.flatMap((order) => {
      const events = []
      const serviceName = order.service?.name
      const colorId = serviceName && colorsData[serviceName] ? colorsData[serviceName] : null
      const color = colorId && calendarColors[colorId] ? calendarColors[colorId].hex : '#eee'

      if (order.date) {
        const eventTime = dayjs(order.date).format('HH:mm')
        events.push({
          id: order.id,
          title: `${getOrderIcons(order, iconsData)} ${
            order.address ? `${eventTime}(${order.duration}h) ${order.name}` : ''
          }`,
          start: order.date,
          extendedProps: {
            color,
            eventType: 'order',
            orderId: order.id,
          },
        })
      }

      if (order.boxes?.deliveryDate && Number(order.boxes?.amount) > 0) {
        const boxColorId = colorsData.boxes || '1'
        const boxColor = calendarColors[boxColorId] ? calendarColors[boxColorId].hex : '#7986cb'
        const deliveryTime = dayjs(order.boxes.deliveryDate).format('HH:mm')
        events.push({
          id: `${order.id}-box-delivery`,
          title: getBoxEventTitle(order, 'boxDelivery', deliveryTime, iconsData),
          start: order.boxes.deliveryDate,
          extendedProps: {
            color: boxColor,
            eventType: 'boxDelivery',
            orderId: order.id,
          },
        })
      }

      if (order.boxes?.returnDate && Number(order.boxes?.amount) > 0) {
        const boxColorId = colorsData.boxes || '1'
        const boxColor = calendarColors[boxColorId] ? calendarColors[boxColorId].hex : '#7986cb'
        const returnTime = dayjs(order.boxes.returnDate).format('HH:mm')
        events.push({
          id: `${order.id}-box-return`,
          title: getBoxEventTitle(order, 'boxReturn', returnTime, iconsData),
          start: order.boxes.returnDate,
          extendedProps: {
            color: boxColor,
            eventType: 'boxReturn',
            orderId: order.id,
          },
        })
      }

      return events
    })
  }, [orders])

  function renderEventContent(eventInfo) {
    const bgColor = eventInfo.event.extendedProps.color
    return (
      <div className="fc-event-title" style={{ backgroundColor: bgColor }}>
        <span>{eventInfo.event.title}</span>
      </div>
    )
  }

  function handleEventClick(info) {
    const orderId = info.event.id
    history.push({ pathname: `${match.url}/order/${orderId}`, state: { fromCalendar: true } })
  }

  function closeModal() {
    if (location.state && location.state.fromCalendar) {
      history.goBack()
      return
    }
    history.push(match.url)
  }

  function handleNewOrderOpen() {
    setNewOrderOpen(true)
  }

  function handleNewOrderClose() {
    setNewOrderOpen(false)
  }

  function handleNewOrderCreated() {
    setNewOrderOpen(false)
    queryClient.invalidateQueries({ queryKey: ['calendar-orders'] })
  }

  if (receiptRouteMatch?.params?.orderId) {
    return (
      <ReceiptPage
        orderId={receiptRouteMatch.params.orderId}
        initialDraft={location.state?.receiptDraft || null}
        documentType={location.state?.documentType || null}
      />
    )
  }

  return (
    <div className="calendar">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        views={views}
        customButtons={{
          createOrderButton: {
            text: 'Create order',
            click: handleNewOrderOpen,
          },
          refreshOrdersButton: {
            text: isRefreshing ? 'Refreshing...' : 'Refresh',
            click: () => {
              if (!isFetching) {
                refetch()
              }
            },
          },
        }}
        headerToolbar={{
          left: 'createOrderButton prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek,multiMonthYear refreshOrdersButton',
        }}
        events={events}
        eventContent={renderEventContent}
        firstDay={1}
        eventClick={handleEventClick}
        datesSet={() => {
          const api = calendarRef.current?.getApi?.()
          if (api?.view) {
            setDateRange({
              from: api.view.activeStart.toISOString(),
              to: api.view.activeEnd.toISOString(),
            })
          }
        }}
        buttonHints={{
          createOrderButton: 'Create a new order',
          refreshOrdersButton: isRefreshing
            ? 'Refreshing the current order list'
            : 'Refresh orders for the current view',
        }}
        {...mobileCalendarProps}
      />
      {(isInitialLoading || isError || hasNoOrders || isRefreshing) && (
        <div
          className={`calendar-status-panel ${
            isError
              ? 'calendar-status-panel--error'
              : hasNoOrders
              ? 'calendar-status-panel--empty'
              : isRefreshing
              ? 'calendar-status-panel--refreshing'
              : 'calendar-status-panel--loading'
          }`}
          role={isError ? 'alert' : 'status'}
          aria-live={isError ? 'assertive' : 'polite'}
        >
          <p className="calendar-status-panel-title">
            {isError
              ? 'Orders are unavailable'
              : hasNoOrders
              ? 'No orders in this time range'
              : isRefreshing
              ? 'Refreshing orders'
              : 'Loading orders'}
          </p>
          <p className="calendar-status-panel-text">
            {isError
              ? errorMessage
              : hasNoOrders
              ? 'Try a different date range or create a new order.'
              : isRefreshing
              ? 'Applying the latest updates to this calendar.'
              : 'Preparing your calendar view.'}
          </p>
        </div>
      )}
      {selectedOrderId && (
        <OrderDialog onClose={closeModal} eventId={selectedOrderId} order={selectedOrder} />
      )}
      <NewOrderDialog
        open={newOrderOpen}
        onClose={handleNewOrderClose}
        onOrderCreated={handleNewOrderCreated}
      />
    </div>
  )
}
