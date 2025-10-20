/* eslint-disable react/no-array-index-key */
import React, { useEffect, useState } from 'react'
import Button from '@material-ui/core/Button'
import isJSON from 'validator/es/lib/isJSON'
import Order from '../../../helpers/Order'

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
        isNew: new Date(order.date).toDateString() === new Date(Date.now()).toDateString(),
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
    return Order.ORDER_KEYS.map((key, index) => {
      let value = jsonOrder[key]

      switch (key) {
        case 'distance':
        case 'hsy':
        case 'XL':
        case 'initialFees':
        case 'manualFees':
        case 'manualBoxesPrice':
        case 'eventColor': {
          return null
        }
        case 'date': {
          value = `${new Date(value).toLocaleDateString()} ${new Date(value)
            .toLocaleTimeString()
            .slice(0, 5)}`
          break
        }
        case 'duration': {
          value = `${value ?? '?'} h`
          break
        }
        case 'boxes': {
          if (!value.amount) {
            return null
          }

          value = `Delivery: ${new Date(value.deliveryDate).toLocaleDateString()} ${new Date(
            value.deliveryDate
          )
            .toLocaleTimeString()
            .slice(0, 5)}, Return: ${new Date(value.returnDate).toLocaleDateString()} ${new Date(
            value.returnDate
          )
            .toLocaleTimeString()
            .slice(0, 5)}, Amount: ${value.amount} kpl`
          break
        }
        case 'address':
        case 'destination':
          value = Order.getAddressString(value)
          break
        case 'extraAddresses':
          value = value.map((addr) => Order.getAddressString(addr)).join('; ')
          if (!value) {
            return null
          }
          break
        case 'service': {
          value = `${value.name} (${value.pricePerHour}€/h)`
          break
        }
        case 'price':
          value = `${value} €`
          break
        case 'paymentType':
          value = value.name
          break
        case 'fees':
          value = value.map((fee) => `${fee.name}: ${fee.amount}€`).join('; ')
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
