import React, { useEffect, useState } from 'react'
import Button from '@material-ui/core/Button'
import './styles.css'

export default function OrdersList({
  orders,
  handleExport,
  handleDeletion,
  labelForDeletion,
}) {
  const [ordersWithStyles, setOrdersWithStyles] = useState([])

  useEffect(() => {
    setOrdersWithStyles(
      orders.map((order) => ({
        ...order,
        isNew:
          new Date(order.date).toDateString() ===
          new Date(Date.now()).toDateString(),
        className: order.confirmed
          ? 'basic-order-style confirmed-order-style'
          : 'basic-order-style',
        hidden: order.confirmed,
      }))
    )
  }, [orders])

  function handleHideOrShow(order) {
    setOrdersWithStyles([
      ...ordersWithStyles.map((o) => {
        if (o.id === order.id) {
          return {
            ...order,
            hidden: !o.hidden,
            className: o.hidden
              ? 'basic-order-style'
              : 'basic-order-style confirmed-order-style',
          }
        }
        return o
      }),
    ])
  }

  function empty() {
    return <p>Nothing found</p>
  }

  function list() {
    return ordersWithStyles.map((order) => (
      <div className="order-pool-list" key={order.id}>
        <div className="order-top-bar">
          <div className="order-status-icons-container">
            {order.isNew && (
              <span className="order-status-new-order order-status-icon">
                NEW
              </span>
            )}
            <span
              // className={
              //   order.confirmed
              //     ? 'order-status-icon order-status-confirmed '
              //     : 'order-status-icon order-status-notification'
              // }
              className={`order-status-icon ${
                order.confirmed
                  ? 'order-status-icon order-status-confirmed'
                  : 'order-status-icon order-status-notification'
              }`}
            >
              {order.confirmed ? '✔' : '❕'}{' '}
            </span>
          </div>
          <div className="order-actions">
            <Button
              style={{ padding: 0, fontSize: '0.9rem' }}
              variant="text"
              size="small"
              onClick={() => handleDeletion(order.id)}
            >
              {labelForDeletion}
            </Button>
            <Button
              disabled={order.confirmed}
              style={{ padding: 0, fontSize: '0.8rem' }}
              onClick={() => handleExport(order)}
              variant="text"
              size="small"
            >
              Export
            </Button>
            <Button
              style={{ padding: 0 }}
              variant="text"
              size="small"
              onClick={() => handleHideOrShow(order)}
            >
              {order.hidden ? 'Show ➕' : 'Hide ➖'}
            </Button>
          </div>
        </div>
        <div
          tabIndex="0"
          label="Show hidden order if it's confirmed."
          role="button"
          onClick={order.confirmed ? () => handleHideOrShow(order) : null}
          onKeyPress={order.confirmed ? () => handleHideOrShow(order) : null}
          className={`${order.className} list-item-1`}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: order.text?.split('\n').join('<br>'),
          }}
        />
      </div>
    ))
  }

  return orders.length === 0 ? empty() : list()
}
