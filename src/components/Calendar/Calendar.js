import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import OrderDialog from './OrderDialog'
import NewOrderDialog from './NewOrderDialog'
import ReceiptPage from './ReceiptPage'
import { getOrderIcons, getBoxEventTitle, parseBoxEventId } from './helpers'
import colorsData from './calendar.data.colors.json'
import calendarColors from '../../shared/colors'
import {
  HELSINKI_TIMEZONE,
  formatInTimeZone,
  formatHelsinkiCalendarDate,
  isDateOnly,
  parseCalendarDate,
  parseInstant,
} from '../../shared/date-fns-tz'
import { orderTime } from '../../shared/orderPricing'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import multiMonthPlugin from '@fullcalendar/multimonth'
import iconsData from '../../data/icons.json'
import { useCalendarOrders } from '../../hooks/useCalendarOrders'
import './Calendar.css'
import { isCanceled, isDeleted, isConfirmed } from '../../shared/orderState.helpers'

const SHOW_DELETED_ORDERS_STORAGE_KEY = 'calendar-show-deleted-orders'
const CALENDAR_VIEW_STORAGE_KEY = 'calendar-selected-view'
const DEFAULT_CALENDAR_VIEW = 'dayGridMonth'
const AVAILABLE_CALENDAR_VIEWS = ['dayGridMonth', 'timeGridWeek', 'listWeek', 'multiMonthYear']
// use `isDeleted` helper from shared/orderState.helpers

function calendarEventStart(value, fieldName) {
  if (isDateOnly(value)) {
    parseCalendarDate(value, fieldName)
    return value
  }
  return parseInstant(value, fieldName).toISOString()
}

function calendarEventTime(value, fieldName) {
  if (isDateOnly(value)) return ''
  return formatInTimeZone(parseInstant(value, fieldName), 'HH:mm', HELSINKI_TIMEZONE)
}

export default function Calendar() {
  const calendarWrapRef = useRef(null)
  const calendarRef = useRef(null)
  const [showDeletedOrders, setShowDeletedOrders] = useState(() => {
    if (typeof window === 'undefined') return false

    try {
      return window.localStorage.getItem(SHOW_DELETED_ORDERS_STORAGE_KEY) === 'true'
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
      return false
    }
  })
  const [calendarView, setCalendarView] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CALENDAR_VIEW

    try {
      const savedView = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY)
      return AVAILABLE_CALENDAR_VIEWS.includes(savedView) ? savedView : DEFAULT_CALENDAR_VIEW
    } catch {
      // Browser storage can be unavailable in private or restricted contexts.
      return DEFAULT_CALENDAR_VIEW
    }
  })
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())
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
    dayGridMonth: {
      height: 'auto',
      contentHeight: 'auto',
      expandRows: false,
    },
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
            height: 'auto',
            contentHeight: '100%',
            expandRows: true,
          },
        }
      : {}),
  }

  useEffect(() => {
    const api = calendarRef.current?.getApi?.()
    if (!api) return

    const view = api.view
    if (!view) return

    setDateRange({
      from: view.activeStart.toISOString(),
      to: view.activeEnd.toISOString(),
    })

    const visibleDate = api.getDate?.()
    if (visibleDate instanceof Date && !Number.isNaN(visibleDate.getTime())) {
      setCurrentCalendarDate(visibleDate)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(
        SHOW_DELETED_ORDERS_STORAGE_KEY,
        showDeletedOrders ? 'true' : 'false'
      )
    } catch {
      // Calendar preferences are optional when browser storage is unavailable.
    }
  }, [showDeletedOrders])

  // Mobile: enable swipe left/right to navigate calendar (prev/next)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!calendarWrapRef.current) return

    const isMobileView = window.innerWidth <= 600
    if (!isMobileView) return

    const el = calendarWrapRef.current
    const api = calendarRef.current?.getApi?.()
    if (!api || !el) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      tracking = true
    }

    const onTouchEnd = (e) => {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches && e.changedTouches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      // horizontal swipe should be larger than vertical movement and pass threshold
      const threshold = 40
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx < 0) {
          api.next()
        } else {
          api.prev()
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, calendarView)
    } catch {
      // Calendar preferences are optional when browser storage is unavailable.
    }
  }, [calendarView])

  const { data: orders = [], refetch, isLoading, isFetching, isError, error } = useCalendarOrders({
    from: dateRange?.from,
    to: dateRange?.to,
    deleted: showDeletedOrders ? null : false,
  })
  const hasDateRange = Boolean(dateRange?.from && dateRange?.to)
  const isMonthViewActive = calendarView === 'dayGridMonth'
  const isHasOrders = orders.length > 0
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

  const currentMonthSummary = useMemo(() => {
    if (!(currentCalendarDate instanceof Date) || Number.isNaN(currentCalendarDate.getTime())) {
      return { total: 0, canceled: 0, services: [] }
    }

    let targetMonth
    try {
      targetMonth = formatHelsinkiCalendarDate(currentCalendarDate, 'calendar view date').slice(0, 7)
    } catch {
      return { total: 0, canceled: 0, services: [] }
    }
    const serviceCounter = {}
    let total = 0
    let canceled = 0

    orders.forEach((order) => {
      if (!order?.date) return

      if (isDeleted(order)) return

      let orderMonth
      try {
        orderMonth = formatHelsinkiCalendarDate(order.date, 'order date').slice(0, 7)
      } catch {
        return
      }

      const matchesCurrentMonth = orderMonth === targetMonth

      if (!matchesCurrentMonth) return

      total += 1
      const isCanceledOrder = isCanceled(order)
      if (isCanceledOrder) {
        canceled += 1
        return
      }

      const serviceName = order.service?.name || 'Uncategorized'
      serviceCounter[serviceName] = (serviceCounter[serviceName] || 0) + 1
    })

    return {
      total,
      canceled,
      services: Object.entries(serviceCounter).sort((a, b) => b[1] - a[1]),
    }
  }, [orders, currentCalendarDate])

  const events = useMemo(() => {
    if (!orders?.length) return []

    return orders.flatMap((order) => {
      const events = []
      const serviceName = order.service?.name
      const customColorIdRaw = order?.eventColor ?? null
      const customColorId = customColorIdRaw == null ? null : String(customColorIdRaw)
      const serviceColorId = serviceName && colorsData[serviceName] ? colorsData[serviceName] : null
      const colorId =
        customColorId && calendarColors[customColorId] ? customColorId : serviceColorId
      const canceled = isCanceled(order)
      const isDeletedOrder = isDeleted(order)
      const deletedOrderColor = '#3937375d'
      const deletedIcon = '❗️'
      const notConfirmedIcon = '❓'
      const isConfirmedOrder = isConfirmed(order)
      const addIcon = isDeletedOrder ? deletedIcon : !isConfirmedOrder ? notConfirmedIcon : ''
      const color = isDeletedOrder
        ? deletedOrderColor
        : !isConfirmedOrder
        ? '#dedddd'
        : canceled
        ? '#616161'
        : colorId && calendarColors[colorId]
        ? calendarColors[colorId].hex
        : '#eee'

      if (order.date) {
        const eventTime = orderTime(order)
        events.push({
          id: order.id,
          title: `${addIcon}${getOrderIcons(order, iconsData)} ${
            order.address ? `${eventTime}(${order.duration}h) ${order.name}` : ''
          }`,
          start: calendarEventStart(order.date, 'order date'),
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            color,
            eventType: 'order',
            orderId: order.id,
          },
        })
      }

      if (order.boxes?.deliveryDate && Number(order.boxes?.amount) > 0) {
        const boxColorId = colorsData.boxes || '1'
        const boxColor = isDeletedOrder
          ? deletedOrderColor
          : !isConfirmedOrder
          ? '#dedddd'
          : canceled
          ? '#616161'
          : calendarColors[boxColorId]
          ? calendarColors[boxColorId].hex
          : '#7986cb'
        const deliveryDateOnly = isDateOnly(order.boxes.deliveryDate)
        const deliveryTime = calendarEventTime(
          order.boxes.deliveryDate,
          'box delivery date',
        )
        events.push({
          id: `${order.id}-box-delivery`,
          title: `${addIcon}${getBoxEventTitle(order, 'boxDelivery', deliveryTime, iconsData)}`,
          start: calendarEventStart(order.boxes.deliveryDate, 'box delivery date'),
          ...(deliveryDateOnly ? { allDay: true } : {}),
          backgroundColor: boxColor,
          borderColor: boxColor,
          extendedProps: {
            color: boxColor,
            eventType: 'boxDelivery',
            orderId: order.id,
          },
        })
      }

      if (order.boxes?.returnDate && Number(order.boxes?.amount) > 0) {
        const boxColorId = colorsData.boxes || '1'
        const boxColor = isDeletedOrder
          ? deletedOrderColor
          : !isConfirmedOrder
          ? '#dedddd'
          : canceled
          ? '#616161'
          : calendarColors[boxColorId]
          ? calendarColors[boxColorId].hex
          : '#7986cb'
        const returnDateOnly = isDateOnly(order.boxes.returnDate)
        const returnTime = calendarEventTime(order.boxes.returnDate, 'box return date')
        events.push({
          id: `${order.id}-box-return`,
          title: `${addIcon}${getBoxEventTitle(order, 'boxReturn', returnTime, iconsData)}`,
          start: calendarEventStart(order.boxes.returnDate, 'box return date'),
          ...(returnDateOnly ? { allDay: true } : {}),
          backgroundColor: boxColor,
          borderColor: boxColor,
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
      <div className="fc-event-inner" style={{ backgroundColor: bgColor }}>
        <div className="fc-event-title" style={{ backgroundColor: bgColor }}>
          <span>{eventInfo.event.title}</span>
        </div>
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
    <div
      className={`calendar ${calendarView === 'timeGridWeek' ? 'calendar--week-view' : ''}`}
      ref={calendarWrapRef}
    >
      <div className="calendar-toolbar" role="toolbar" aria-label="Calendar options">
        <label className="calendar-toolbar-toggle" htmlFor="calendar-show-deleted-orders">
          <span className="calendar-toolbar-toggle-label">Show deleted</span>
          <input
            id="calendar-show-deleted-orders"
            className="calendar-toolbar-toggle-input"
            type="checkbox"
            checked={showDeletedOrders}
            onChange={(event) => setShowDeletedOrders(event.target.checked)}
          />
          <span className="calendar-toolbar-toggle-slider" aria-hidden="true" />
        </label>
      </div>
      <FullCalendar
        ref={calendarRef}
        timeZone={HELSINKI_TIMEZONE}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin]}
        initialView={calendarView}
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
          left: 'dayGridMonth,timeGridWeek,listWeek,multiMonthYear prev,next today',
          center: 'title',
          right: 'createOrderButton refreshOrdersButton',
        }}
        events={events}
        eventContent={renderEventContent}
        firstDay={1}
        eventClick={handleEventClick}
        datesSet={(dateInfo) => {
          if (dateInfo?.view?.type && dateInfo.view.type !== calendarView) {
            setCalendarView(dateInfo.view.type)
          }

          const api = calendarRef.current?.getApi?.()
          if (api?.view) {
            setDateRange({
              from: api.view.activeStart.toISOString(),
              to: api.view.activeEnd.toISOString(),
            })

            const visibleDate = api.getDate?.()
            if (visibleDate instanceof Date && !Number.isNaN(visibleDate.getTime())) {
              setCurrentCalendarDate(visibleDate)
            }
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
      {isMonthViewActive && hasDateRange && !isInitialLoading && !isError && isHasOrders && (
        <div className="calendar-month-summary" role="status" aria-live="polite">
          <div className="calendar-month-summary-header">
            <p className="calendar-month-summary-title">Total orders</p>
            <p className="calendar-month-summary-total">{currentMonthSummary.total}</p>
          </div>

          {currentMonthSummary.canceled > 0 && (
            <li className="calendar-month-summary-item" key="canceled-orders">
              <span className="calendar-month-summary-service-name">Canceled orders</span>
              <span className="calendar-month-summary-service-count">
                {currentMonthSummary.canceled}
              </span>
            </li>
          )}
          {currentMonthSummary.services.map(([serviceName, serviceCount]) => (
            <li className="calendar-month-summary-item" key={serviceName}>
              <span className="calendar-month-summary-service-name">{serviceName}</span>
              <span className="calendar-month-summary-service-count">{serviceCount}</span>
            </li>
          ))}
        </div>
      )}
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
        <OrderDialog
          onClose={closeModal}
          eventId={selectedOrderId}
          order={selectedOrder}
          onOrderUpdate={refetch}
        />
      )}
      <NewOrderDialog
        open={newOrderOpen}
        onClose={handleNewOrderClose}
        onOrderCreated={handleNewOrderCreated}
      />
    </div>
  )
}
