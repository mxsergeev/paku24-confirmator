/* eslint-disable react/no-array-index-key */
import React, { useEffect, useState } from 'react'
import Button from '@material-ui/core/Button'
import isJSON from 'validator/es/lib/isJSON'

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

  function JSONOrder(jsonOrder, id) {
    return Object.entries(JSON.parse(jsonOrder)).map(([fieldName, fieldValue], index) => (
      <div
        key={`${fieldName}${fieldValue}${id}`}
        style={{
          minHeight: '1.2rem',
          backgroundColor: index % 2 !== 0 && 'var(--brand-color-very-light)',
        }}
      >
        <span style={{ fontWeight: 'bold' }}>{fieldName}</span>:{' '}
        {fieldName === 'dateTime'
          ? `${new Date(fieldValue).toLocaleDateString()} ${new Date(fieldValue)
              .toLocaleTimeString()
              .slice(0, 5)}`
          : fieldValue}
      </div>
    ))
  }

  function textOrder(txtOrder, id) {
    return txtOrder.split('\n').map((line, index) => <div key={`${id}${index}${line}`}>{line}</div>)
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
            <div className={orderWithStyles.className}>
              {isJSON(orderWithStyles.order.text)
                ? JSONOrder(orderWithStyles.order.text, orderWithStyles.order.id)
                : textOrder(orderWithStyles.order.text, orderWithStyles.order.id)}
            </div>
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
