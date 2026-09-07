import React from 'react'
import validator from 'validator'
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline'
import { formatHelsinkiCalendarDate, parseInstant } from '../../shared/date-fns-tz'
import { orderTime } from '../../shared/orderPricing'

function ValidationMessages({ validationArray }) {
  const errStyle = { color: 'red' }

  return (
    <>
      {validationArray.map((v) => {
        if (v.isError) {
          return (
            <div key={v.id}>
              <span style={errStyle}>{v.name} </span>
              {v.message}
            </div>
          )
        }
        return null
      })}
    </>
  )
}

export default function ValidationDisplay({ order }) {
  let date = null
  let time = '---'

  try {
    date = parseInstant(order?.date, 'order date')
    time = orderTime(order)
  } catch {
    // An incomplete draft is expected while the form is being filled in.
  }

  const validationArray = [
    {
      id: 1,
      name: 'Date and time',
      isError: !date || validator.isBefore(date.toISOString(), new Date().toISOString()),
      message: `might have some problems. Check to be sure: ${
        date ? `${formatHelsinkiCalendarDate(date, 'order date')} ${time}` : '---'
      }`,
    },
    {
      id: 2,
      name: 'Address',
      isError: validator.isEmpty(order?.address?.street || ''),
      message: 'is missing',
    },
    {
      id: 3,
      name: 'Phonenumber',
      isError: !validator.isMobilePhone(order?.phone || '', ['fi-FI', 'es-ES', 'sv-SE']),
      message: `is missing or is incorrect: ${order?.phone || '---'}`,
    },
    {
      id: 4,
      name: 'Email',
      isError: !validator.isEmail(order?.email || ''),
      message: `is missing or is incorrect: ${order?.email || '---'}`,
    },
  ]

  const someIsInvalid = validationArray.some((v) => v.isError)

  const border = {
    borderTop: '1px solid gray',
    borderBottom: '1px solid gray',
    padding: '15px 0 15px 0',
    margin: '10px 0 10px 0',
  }

  return (
    <>
      {someIsInvalid && (
        <div style={border} className="flex-100-space-between">
          <div>
            <ErrorOutlineIcon />
            <ValidationMessages validationArray={validationArray} />
          </div>
        </div>
      )}
    </>
  )
}
