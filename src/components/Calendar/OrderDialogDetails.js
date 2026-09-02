import React from 'react'
import colors from '../../shared/colors'
import ColorSelector from '../common/ColorSelector'
import { isCanceled, isDeleted } from '../../shared/orderState.helpers'
import { HELSINKI_TIMEZONE, formatInTimeZone, parseInstant } from '../../shared/date-fns-tz'
import { formatBoxDate } from '../../shared/render/text'
import { resolveFeeDisplayName } from '../../shared/render/fees'
import { getOrderPricing } from '../../shared/orderPricing'

export default function OrderDialogDetails({
  order,
  eventType,
  onEventColorChange,
}) {
  const isCanceledOrder = isCanceled(order)
  const isDeletedOrder = isDeleted(order)
  const pricing = order ? getOrderPricing(order) : null
  const hasClientNumber = Boolean(order?.phone)
  const hasBoxes = Number(order?.boxes?.amount) > 0
  const isBoxEvent = eventType === 'boxDelivery' || eventType === 'boxReturn'
  const showRegularOrder = order && !isBoxEvent
  const hasExtraAddresses =
    order?.extraAddresses && Array.isArray(order.extraAddresses) && order.extraAddresses.length > 0
  const hasClientEmail = Boolean(order?.email)
  const selectedEventColorId = order?.eventColor || ''

  const boxRows =
    order?.boxes && isBoxEvent && hasBoxes
      ? [
          {
            label: 'Date',
            value:
              eventType === 'boxDelivery'
                ? formatBoxDate(order.boxes.deliveryDate, 'box delivery date')
                : formatBoxDate(order.boxes.returnDate, 'box return date'),
          },
          { label: 'Boxes', value: `${order.boxes.amount} pcs` },
          {
            label: 'Price',
            value: `${pricing?.boxesPrice ?? 0}€`,
          },
        ]
      : []

  const regularRows = order
    ? [
        { label: 'Service', value: order.service?.name || '' },
        { label: 'Payment Type', value: order.paymentType?.name || '' },
        {
          label: 'From',
          value: `${order.address?.street} (${order.address?.floor} floor), ${order.address?.index} ${order.address?.city}`,
        },
        hasExtraAddresses && {
          label: 'Additional addresses',
          value: order.extraAddresses.map((addr, index) => (
            <div
              key={index}
              className="order-dialog-details__extra-address"
            >{`${addr.street} (${addr.floor} floor), ${addr.index} ${addr.city}`}</div>
          )),
        },
        order.destination &&
          order.destination.street && {
            label: 'To',
            value: `${order.destination.street} (${order.destination?.floor} floor), ${order.destination.index} ${order.destination.city}`,
          },
        hasBoxes && {
          label: 'Boxes',
          value: `${order.boxes.amount} pcs, ${pricing.boxesPrice}€`,
        },
        { label: 'Total price', value: `${pricing.price || 0}€` },
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
          <div className="order-dialog-details__row">
            <span className="order-dialog-details__label">Date</span>
            <span className="order-dialog-details__value">
              {formatInTimeZone(
                parseInstant(order.date, 'order date'),
                'dd.MM.yyyy HH:mm',
                HELSINKI_TIMEZONE,
              )}
            </span>
          </div>
          {regularRows.map((row) => (
            <div key={row.label} className="order-dialog-details__row">
              <span className="order-dialog-details__label">{row.label}</span>
              <span className="order-dialog-details__value">{row.value}</span>
            </div>
          ))}
          <div className="order-dialog-details__row">
            <span className="order-dialog-details__label">Client name</span>
            <span className="order-dialog-details__value">{order.name}</span>
          </div>
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
          {pricing.fees.length > 0 && (
            <div className="order-dialog-details__fees-section">
              <span className="order-dialog-details__label">Fees</span>
              <ul className="calendar-fee-list">
                {pricing.fees.map((fee, index) => {
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
            {isCanceledOrder && (
              <div className="order-dialog-details__row">
                <span className="order-dialog-details__label">Canceled at</span>
                <span className="order-dialog-details__value">
                  {formatInTimeZone(
                    parseInstant(order.canceledAt, 'canceled at'),
                    'dd.MM.yyyy HH:mm',
                    HELSINKI_TIMEZONE,
                  )}
                </span>
              </div>
            )}
            {isDeletedOrder && (
              <div className="order-dialog-details__row">
                <span className="order-dialog-details__label">Deleted at</span>
                <span className="order-dialog-details__value">
                  {formatInTimeZone(
                    parseInstant(order.deletedAt, 'deleted at'),
                    'dd.MM.yyyy HH:mm',
                    HELSINKI_TIMEZONE,
                  )}
                </span>
              </div>
            )}
          </div>
          {!isCanceledOrder && !isDeletedOrder && (
            <div className="order-dialog-details__row">
              <span className="order-dialog-details__label">Event color</span>
              <span className="order-dialog-details__value">
                <ColorSelector
                  value={selectedEventColorId}
                  onChange={onEventColorChange}
                  colors={colors}
                />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
