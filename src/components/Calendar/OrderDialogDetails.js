import React from 'react'
import dayjs from 'dayjs'

export default function OrderDialogDetails({ order, eventType }) {
  const hasClientNumber = !!(order?.phone && order.phone.replace(/0/g, '') !== '')
  const isBoxEvent = eventType === 'boxDelivery' || eventType === 'boxReturn'
  const showRegularOrder = order && !isBoxEvent

  const boxRows =
    order?.boxes && isBoxEvent
      ? [
          {
            label: 'Date',
            value:
              eventType === 'boxDelivery'
                ? dayjs(order.boxes.deliveryDate).format('DD.MM.YYYY HH:mm')
                : dayjs(order.boxes.returnDate).format('DD.MM.YYYY HH:mm'),
          },
          { label: 'Boxes', value: `${order.boxes.amount} kpl` },
          {
            label: 'Price',
            value: `${
              eventType === 'boxDelivery'
                ? order.boxes.deliveryPrice || 0
                : order.boxes.returnPrice || 0
            }€`,
          },
        ]
      : []

  const regularRows = order
    ? [
        {
          label: 'From',
          value: `${order.address?.street}, ${order.address?.index} ${order.address?.city}`,
        },
        order.extraAddress && {
          label: 'Extra Address',
          value: order.extraAddress,
        },
        order.destination &&
          order.destination.street && {
            label: 'To',
            value: `${order.destination.street}, ${order.destination.index} ${order.destination.city}`,
          },
        { label: 'Payment Type', value: order.paymentType?.name || '' },
        { label: 'Total Price', value: `${order.price || 0}€` },
        order.boxes && {
          label: 'Boxes',
          value: `${order.boxes.amount} kpl, ${order.boxesPrice}€`,
        },
        { label: 'Service', value: order.service?.name || '' },
      ].filter(Boolean)
    : []

  return (
    <div className="order-dialog-details">
      {order && isBoxEvent && (
        <div className="order-dialog-details__section">
          <div className="order-dialog-details__row">
            <span className="order-dialog-details__label">Address</span>
            <span className="order-dialog-details__value">
              {order.address?.street}, {order.address?.index} {order.address?.city}
            </span>
          </div>
          {boxRows.map((row) => (
            <div key={row.label} className="order-dialog-details__row">
              <span className="order-dialog-details__label">{row.label}</span>
              <span className="order-dialog-details__value">{row.value}</span>
            </div>
          ))}
          {hasClientNumber && (
            <div className="order-dialog-details__row">
              <span className="order-dialog-details__label">Client number</span>
              <span className="order-dialog-details__value">{order.phone}</span>
            </div>
          )}
        </div>
      )}
      {showRegularOrder && (
        <div className="order-dialog-details__section">
          {regularRows.map((row) => (
            <div key={row.label} className="order-dialog-details__row">
              <span className="order-dialog-details__label">{row.label}</span>
              <span className="order-dialog-details__value">{row.value}</span>
            </div>
          ))}
          {order.fees && Array.isArray(order.fees) && order.fees.length > 0 && (
            <div className="order-dialog-details__fees-section">
              <span className="order-dialog-details__label">Fees</span>
              <ul className="calendar-fee-list">
                {order.fees.map((fee, index) => (
                  <li key={index} className="calendar-fee-item">
                    {fee.name}: {fee.amount}€
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasClientNumber && (
            <div className="order-dialog-details__row">
              <span className="order-dialog-details__label">Client number</span>
              <span className="order-dialog-details__value">{order.phone}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
