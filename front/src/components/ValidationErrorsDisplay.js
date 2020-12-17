import React, { useState, useEffect } from 'react'
import validator from 'validator'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline'

export default function ValidationErrorsDisplay(props) {
  const { order, handleSetError, confirmation, custom } = props

  const [errors, setErrors] = useState([])
  const [ignore, setIgnore] = useState(false)
  const [showSwitch, setShowSwitch] = useState(false)

  useEffect(() => {
    if (!ignore) {
      const errs = [
        {
          type: 'date',
          error: validator.isBefore(order.date.ISODate, new Date().toISOString()),
          message: `earlier than today. Value: ${order.date.confirmationFormat || "No value"}`
        },
        {
          type: 'address',
          error: validator.isEmpty(order.address), 
          message: `missing or is in incorrect format. Value: ${order.address || "No value"}`
        },
        {
          type: 'phone',
          error: !validator.isMobilePhone(order.phone, ['fi-FI', 'es-ES', 'sv-SE']), 
          message: `missing or is in incorrect format. Value: ${order.phone || "No value"}`
        },
        {
          type: 'email',
          error: custom ? false : !validator.isEmail(order.email), 
          message: `missing or is in incorrect format. Value: ${order.email || "No value"}`
        },
      ]
      setErrors(errs)
      const areThereSomeErrors = errs.some(error => error.error)
      handleSetError(areThereSomeErrors)
      setShowSwitch(areThereSomeErrors)
    }
    else handleSetError(false)
  }, [order.date, order.phone, order.address, order.email, ignore, custom, handleSetError])

  function handleIgnore(e) {
    setIgnore(e.target.checked)
    setShowSwitch(errors.some(error => error.error))
  }

  const errStyle = { color: 'red' }
  const ignoreStyle = { color: 'gray' }
  const border = { 
    borderTop: '1px solid gray', 
    borderBottom: '1px solid gray', 
    padding: '15px 0 15px 0',
    margin: '10px 0 10px 0'
  }
  const displayStyle = ignore ? ignoreStyle : null
    
  return (
    <>
      {
        confirmation ?     
        <div style={border} className="flex-100-space-between">
          <div style={displayStyle}>
            <ErrorOutlineIcon />
            {
              errors.map((err, index) => {
                if (err.error) {
                  return ( 
                    <>
                      <div key={index}>
                        <span key={100+index} style={ignore ? ignoreStyle : errStyle}>{err.type} </span>
                        {err.message}
                      </div>
                    </>
                  )
                }
                return null
              })
            }
          </div>
        </div> : null
      }
      {
        showSwitch && confirmation ? 
        <FormControlLabel
          style={{ alignSelf: 'flex-end' }}
          control={
            <Checkbox
              checked={ignore}
              onChange={handleIgnore}
              color="default"
            />
          }
          label="Ignore"
        /> : null 
      }
    </>
  )
}