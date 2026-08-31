/* eslint-disable react/no-array-index-key */
import React, { useEffect, useState } from 'react'
import Button from '@material-ui/core/Button'
import { BOOKING_FIELDS } from '../../../shared/orderModel'
import { formatAddress, formatBoxDate } from '../../../shared/render/text'
import {
  formatHelsinkiInstant,
  isSameHelsinkiCalendarDate,
} from '../../../shared/date-fns-tz'

const HIDDEN_BOOKING_FIELDS = ['distance', 'hsy', 'XL', 'eventColor']
const DISPLAY_FIELDS = [
  ...BOOKING_FIELDS.filter((field) => !HIDDEN_BOOKING_FIELDS.includes(field)),
  'fees',
  'boxesPrice',
  'price',
  'canceledAt',
]

function isNewOrder(order) {
  try {
    return isSameHelsinkiCalendarDate(order?.date, new Date())
  } catch {
    return false
  }
}

export default function OrdersList({
  orders,
  handleExport,
  handleDeletion,
  handleLoadingMoreOrders,
  labelForDeletion,
}) {
  const [ordersWithStyles, setOrdersWithStyles] = useState([])

  useEffect(() => {
    setOrdersWithStyles(
      orders.map((order) => ({
        order: {
          ...order,
        },
        isNew: isNewOrder(order),
        className: order.confirmed
          ? 'basic-order-style confirmed-order-style'
          : 'basic-order-style',
        hidden: order.confirmed,
      }))
    )
  }, [orders])

  function handleHideOrShow(orderWithStyles) {
    setOrdersWithStyles([
      ...ordersWithStyles.map((o) => {
        if (o.order.id === orderWithStyles.order.id) {
          return {
            ...orderWithStyles,
            hidden: !o.hidden,
            className: o.hidden ? 'basic-order-style' : 'basic-order-style confirmed-order-style',
          }
        }
        return o
      }),
    ])
  }

  function empty() {
    return <p>Nothing found</p>
  }

  function JSONOrder(jsonOrder) {
    return DISPLAY_FIELDS.map((key, index) => {
      let value = jsonOrder[key]

      switch (key) {
        case 'date': {
          try {
            value = formatHelsinkiInstant(value, 'dd-MM-yyyy HH:mm', 'order date')
          } catch {
            value = ''
          }
          break
        }
        case 'canceledAt': {
          if (value) {
            try {
              value = formatHelsinkiInstant(value, 'dd-MM-yyyy HH:mm', 'canceled at')
            } catch {
              value = ''
            }
          }
          break
        }
        case 'duration': {
          value = `${value ?? '?'} h`
          break
        }
        case 'boxes': {
          if (!value?.amount) {
            return null
          }

          value = `Delivery: ${formatBoxDate(
            value.deliveryDate,
            'box delivery date'
          )}, Return: ${formatBoxDate(value.returnDate, 'box return date')}, Amount: ${
            value.amount
          } kpl`
          break
        }
        case 'address':
        case 'destination':
          value = formatAddress(value)
          break
        case 'extraAddresses':
          value = (value || []).map((addr) => formatAddress(addr)).join('; ')
          if (!value) {
            return null
          }
          break
        case 'service': {
          value = value ? `${value.name} (${value.pricePerHour}€/h)` : ''
          break
        }
        case 'price':
          value = `${value} €`
          break
        case 'paymentType':
          value = value?.name ?? ''
          break
        case 'fees':
          value = (value || []).map((fee) => `${fee.name}: ${fee.amount}€`).join('; ')
          break
        default:
          value = value?.toString() ?? ''
      }

      return (
        <div
          key={key}
          style={{
            minHeight: '1.2rem',
            backgroundColor: index % 2 !== 0 && 'var(--brand-color-very-light)',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>{key}</span>: {value}
        </div>
      )
    })
  }

  function list() {
    return (
      <>
        {ordersWithStyles.map((orderWithStyles) => (
          <div className="order-pool-list" key={orderWithStyles.order.id}>
            <div className="order-top-bar">
              <div className="order-status-icons-container">
                {orderWithStyles.isNew && (
                  <span className="order-status-new-order order-status-icon">NEW</span>
                )}
                <span
                  className={`order-status-icon ${
                    orderWithStyles.order.confirmed
                      ? 'order-status-icon order-status-confirmed'
                      : 'order-status-icon order-status-notification'
                  }`}
                >
                  {orderWithStyles.order.confirmed ? '✔' : '❕'}{' '}
                </span>
              </div>
              <div className="order-actions">
                <Button
                  style={{ padding: 0, fontSize: '0.9rem' }}
                  variant="text"
                  size="small"
                  onClick={() => handleDeletion(orderWithStyles.order.id)}
                >
                  {labelForDeletion}
                </Button>
                <Button
                  style={{
                    padding: 0,
                    fontSize: '0.8rem',
                    color: orderWithStyles.order.confirmed && 'var(--brand-color-dark)',
                  }}
                  onClick={() => {
                    handleExport(orderWithStyles.order)
                  }}
                  variant="text"
                  size="small"
                >
                  Export
                </Button>
                <Button
                  style={{ padding: 0 }}
                  variant="text"
                  size="small"
                  onClick={() => handleHideOrShow(orderWithStyles)}
                >
                  {orderWithStyles.hidden ? 'Show ➕' : 'Hide ➖'}
                </Button>
              </div>
            </div>
            <div className={orderWithStyles.className}>{JSONOrder(orderWithStyles.order)}</div>
          </div>
        ))}
        <Button onClick={handleLoadingMoreOrders} size="small">
          Load more
        </Button>
      </>
    )
  }

  return orders.length === 0 ? empty() : list()
}
