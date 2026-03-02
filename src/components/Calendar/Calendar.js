import React, { useEffect, useState } from 'react'
import { Route, useHistory, useLocation, useRouteMatch } from 'react-router-dom'
import OrderDialog from './OrderDialog'
import dayjs from 'dayjs'
import { getOrderIcons, getBoxEventTitle } from './orderIcons'
import colorsData from './calendar.data.colors.json'
import calendarColors from '../../data/colors.json'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import multiMonthPlugin from '@fullcalendar/multimonth'
import orderPoolAPI from '../../services/orderPoolAPI'
import iconsData from '../../data/icons.json'
import './Calendar.css'

export default function Calendar() {
  const [events, setEvents] = useState([])
  const history = useHistory()
  const location = useLocation()
  const match = useRouteMatch()

  useEffect(() => {
    let isMounted = true

    orderPoolAPI
      .get([1], { deleted: false })
      .then((orders) => {
        if (!isMounted) return
        const calendarEvents = orders.flatMap((order) => {
          const events = []
          const serviceName = order.service?.name
          const colorId = serviceName && colorsData[serviceName] ? colorsData[serviceName] : null
          const color = colorId && calendarColors[colorId] ? calendarColors[colorId].hex : '#eee'
          
          // Main order event
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
          
          // Box delivery event
          if (order.boxes?.deliveryDate) {
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
          
          // Box return event
          if (order.boxes?.returnDate) {
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
        setEvents(calendarEvents)
      })
      .catch(() => {
        if (isMounted) setEvents([])
      })

    return () => {
      isMounted = false
    }
  }, [])

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

  return (
    <div className="calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, multiMonthPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        customButtons={{
          createOrderButton: {
            text: 'New order',
            click: () => history.push('/confirmator'),
          },
        }}
        headerToolbar={{
          left: 'prev,next today createOrderButton',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek,multiMonthYear',
        }}
        events={events}
        eventContent={renderEventContent}
        firstDay={1}
        eventClick={handleEventClick}
        {...(window.innerWidth <= 600
          ? {
              slotMinTime: '00:00:00',
              slotMaxTime: '24:00:00',
              height: 'auto',
            }
          : {})}
      />
      <Route path={`${match.path}/order/:orderId`}>
        {({ match: orderMatch }) => (
          <OrderDialog
            open={Boolean(orderMatch)}
            onClose={closeModal}
            orderId={orderMatch?.params?.orderId || null}
            iconsData={iconsData}
          />
        )}
      </Route>
    </div>
  )
}
