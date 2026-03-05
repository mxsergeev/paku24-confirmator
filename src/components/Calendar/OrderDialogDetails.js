import React from 'react'
import dayjs from 'dayjs'

export default function OrderDialogDetails({ loading, error, order, eventType }) {
  const hasClientNumber = !!(order?.phone && order.phone.replace(/0/g, '') !== '')
  const isBoxEvent = eventType === 'boxDelivery' || eventType === 'boxReturn'

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
            value: `${eventType === 'boxDelivery' ? order.boxes.deliveryPrice || 0 : order.boxes.returnPrice || 0}€`,
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
    <>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {order && !loading && !error && isBoxEvent && (
        <>
          <p>
            <strong>Address:</strong> {order.address?.street}, {order.address?.index} {order.address?.city}
          </p>
          {boxRows.map((row) => (
            <p key={row.label}>
              <strong>{row.label}:</strong> {row.value}
            </p>
          ))}
          {hasClientNumber && (
            <p>
              <strong>Client number:</strong> {order.phone}
            </p>
          )}
        </>
      )}
      {order && !loading && !error && !eventType && (
        <>
          {regularRows.map((row) => (
            <p key={row.label}>
              <strong>{row.label}:</strong> {row.value}
            </p>
          ))}
          {order.fees && Array.isArray(order.fees) && order.fees.length > 0 && (
            <div>
              <strong>Fees:</strong>
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
            <p>
              <strong>Client number:</strong> {order.phone}
            </p>
          )}
        </>
      )}
    </>
  )
}
