import React, { useState, useEffect } from 'react'
import validator from 'validator'
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline'
import Order from '../../shared/Order'

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

export default function ValidationDisplay({ order, shouldValidate }) {
  const [validationArray, setValidationArray] = useState([])

  useEffect(() => {
    if (shouldValidate) {
      const validationAr = [
        {
          id: 1,
          name: 'Date and time',
          isError: validator.isBefore(order.date.toISOString(), new Date().toISOString()),
          message: `might have some problems. Check to be sure: ${
            `${Order.getConfirmationDateString(order.date)} ${order.time}` || '---'
          }`,
        },
        {
          id: 2,
          name: 'Address',
          isError: validator.isEmpty(order.address.street),
          message: 'is missing',
        },
        {
          id: 3,
          name: 'Phonenumber',
          isError: !validator.isMobilePhone(order.phone, ['fi-FI', 'es-ES', 'sv-SE']),
          message: `is missing or is incorrect: ${order.phone || '---'}`,
        },
        {
          id: 4,
          name: 'Email',
          isError: !validator.isEmail(order.email),
          message: `is missing or is incorrect: ${order.email || '---'}`,
        },
      ]
      setValidationArray(validationAr)
    }
  }, [order.date, order.phone, order.address, order.email, order.time, shouldValidate])

  const someIsInvalid = validationArray.some((v) => v.isError)

  const border = {
    borderTop: '1px solid gray',
    borderBottom: '1px solid gray',
    padding: '15px 0 15px 0',
    margin: '10px 0 10px 0',
  }

  return (
    <>
      {shouldValidate && someIsInvalid && (
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
