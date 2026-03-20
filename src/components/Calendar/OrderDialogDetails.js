import React from 'react'
import dayjs from 'dayjs'
import { resolveFeeDisplayName } from './ReceiptPage'

export default function OrderDialogDetails({ order, eventType }) {
  const hasClientNumber = Boolean(order?.phone)
  const hasBoxes = Number(order?.boxes?.amount) > 0
  const isBoxEvent = eventType === 'boxDelivery' || eventType === 'boxReturn'
  const showRegularOrder = order && !isBoxEvent
  const hasExtraAddresses =
    order?.extraAddresses && Array.isArray(order.extraAddresses) && order.extraAddresses.length > 0
  const hasClientEmail = Boolean(order?.email)

  const boxRows =
    order?.boxes && isBoxEvent && hasBoxes
      ? [
          {
            label: 'Date',
            value:
              eventType === 'boxDelivery'
                ? dayjs(order.boxes.deliveryDate).format('DD.MM.YYYY HH:mm')
                : dayjs(order.boxes.returnDate).format('DD.MM.YYYY HH:mm'),
          },
          { label: 'Boxes', value: `${order.boxes.amount} pcs` },
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
          value: `${order.address?.street} (${order.address?.floor} floor), ${order.address?.index} ${order.address?.city}`,
        },
        hasExtraAddresses && {
          label: 'Additional addresses',
          value: order.extraAddresses.map((addr) => (
            <div
              key={addr.id}
              className="order-dialog-details__extra-address"
            >{`${addr.street} (${addr.floor} floor), ${addr.index} ${addr.city}`}</div>
          )),
        },
        order.destination &&
          order.destination.street && {
            label: 'To',
            value: `${order.destination.street} (${order.destination?.floor} floor), ${order.destination.index} ${order.destination.city}`,
          },
        { label: 'Payment Type', value: order.paymentType?.name || '' },
        { label: 'Total price', value: `${order.price || 0}€` },
        hasBoxes && {
          label: 'Boxes',
          value: `${order.boxes.amount} pcs, ${order.boxesPrice}€`,
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
              <span className="order-dialog-details__label">Client phone</span>
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
          {hasClientNumber && (
            <div className="order-dialog-details__row">
              <span className="order-dialog-details__label">Client phone</span>
              <span className="order-dialog-details__value">{order.phone}</span>
            </div>
          )}
          {hasClientEmail && (
            <div className="order-dialog-details__row">
              <span className="order-dialog-details__label">Client email</span>
              <span className="order-dialog-details__value">{order.email}</span>
            </div>
          )}
          {order.fees && Array.isArray(order.fees) && order.fees.length > 0 && (
            <div className="order-dialog-details__fees-section">
              <span className="order-dialog-details__label">Fees</span>
              <ul className="calendar-fee-list">
                {order.fees.map((fee, index) => {
                  const label = resolveFeeDisplayName(order, fee)
                  return (
                    <li key={index} className="calendar-fee-item">
                      {label}: {fee.amount}€
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <div className="order-dialog-details__section">
            {order.comment && (
              <div className="order-dialog-details__row">
                <span className="order-dialog-details__label">Comment</span>
                <span className="order-dialog-details__value">{order.comment}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
