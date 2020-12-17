import React, { useState, useRef, useCallback, useEffect } from 'react'
import Toast from 'light-toast'
import sendConfirmationEmail from '../services/emailAPI'
import addEventToCalendar from '../services/calendarAPI'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import '../styles/convert.css'
import InputModal from './InputModal'
import EditModal from './EditModal'
import * as regexFunc from '../utils/regexFunctions'
import * as regexHelpers from '../utils/helpers/regexHelpers'
import * as calculations from '../utils/helpers/calculations'
import services from '../utils/services.json'

import TransformButton from './buttons/TransformButton'
import CopyButton from './buttons/CopyButton'
import CheckboxGroup from './CheckboxGroup'
import SendSMSButton from './buttons/SendSMSButton'
import SendEmailButton from './buttons/SendEmailButton'
import AddToCalendarButton from './buttons/AddToCalendarButton'
import ValidationErrorsDisplay from './ValidationErrorsDisplay'
import Editor from './Editor'

function makeConvertion(order, str) {
  let converted
  try {
    converted = 
`VARAUSVAHVISTUS
VARAUKSEN TIEDOT
${order.date.confirmationFormat}
ALKAMISAIKA
Klo ${order.time} (+/-15min)
ARVIOITU KESTO
${order.duration}h (${order.servicePrice}€/h, ${order.serviceName})
MAKSUTAPA
${order.paymentType}${order.fees.string}
LÄHTÖPAIKKA
${order.address}${order.destination.length > 1 ? `\nMÄÄRÄNPÄÄ\n${order.destination}` : ''}
NIMI
${order.name}
SÄHKÖPOSTI
${order.email}
PUHELIN
${order.phone}
${order.comment ? `LISÄTIETOJA\n${order.comment}\n` : ''}
KIITOS VARAUKSESTANNE!`
  Toast.info('Succesefully formatted!', 500)
} catch (err) {
  console.log(err)
  Toast.fail(err.message, 1000)
}
  return (
  converted
  )
}

export default function Convert({ custom }) {
  const [text, setText] = useState('')
  const [customText, setCustomText] = useState('')
  const [formattedConfirmation, setFormattedConfirmation] = useState('')
  const [defaultOrder] = useState({
    date: {
      original: new Date(),
      ISODate: new Date().toISOString().split('T')[0],
      confirmationFormat: regexHelpers.toConfirmationDateFormat(new Date()),
    },
    time: `${new Date().toTimeString().split(':')[0]}:${new Date().toTimeString().split(':')[1]}`,
    duration: 1, 
    serviceName: services[0].name,
    servicePrice: services[0].price,
    paymentType: 'Maksukortti',
    fees: {
      array: [],
      string: '',
    },
    address: '',
    destination: '',
    name: '',
    email: '',
    phone: '',
    comment: '',
  })
  const [order, setOrder] = useState(defaultOrder)
  const [options, setOptions] = useState({ 
    distance: 'insideCapital', 
    hsy: order.servicePrice === 40 || order.servicePrice === 70,
    XL: false,
  })
  const [error, setError] = useState(false)
  const textAreaRef = useRef(null)

  useEffect(() => {
    setOrder(defaultOrder)
    setFormattedConfirmation('')
  }, [custom, defaultOrder])

  const handleSetError = useCallback((bool) => setError(bool), [])

  function handleOptionsChange(e) {
    setOptions({ ...options, [e.target.name]: e.target.value || e.target.checked })
  }

  function handleEmailSending() {
    if (order.email && formattedConfirmation) {
      return sendConfirmationEmail(formattedConfirmation, options, order.email)
        .then((res) => Toast.info(res, 500))
        .catch((err) => Toast.fail(err.response.data.error))
    }
    Toast.fail('No confirmation found or recipients defined.', 1000)
  }

  function handleAddingToCalendar() {
    let entry
    try {
      entry = regexFunc.getEventForCalendar(formattedConfirmation)
      if (entry) {
        addEventToCalendar(entry, order, options)
          .then((res) => Toast.info(res, 500))
          .catch((err) => Toast.fail(err.response.data.error))
      }
    } catch (err) {
      Toast.fail(err.message, 1000)
    }
  }

  function handleFormatting() {
    let orderInfo
    try {
      orderInfo = {
        date: {
          original: regexFunc.getStartingTime(text).original,
          ISODate: regexFunc.getStartingTime(text).ISODate,
          confirmationFormat: regexFunc.getStartingTime(text).confirmationFormat,
        },
        time: regexFunc.getStartingTime(text).time,
        duration: regexFunc.getDuration(text), 
        serviceName: regexFunc.getService(text).name,
        servicePrice: regexFunc.getService(text).price,
        paymentType: regexFunc.getPaymentType(text),
        fees: regexHelpers.printFees(regexFunc.getFees(text)),
        address: regexFunc.getAddress(text, 'Frome').address + " " + regexFunc.getAddress(text, 'Frome').city,
        destination: regexFunc.getAddress(text, 'To').address + " " + regexFunc.getAddress(text, 'To').city,
        name: regexFunc.getName(text),
        email: regexFunc.getEmail(text),
        phone: regexFunc.getPhone(text),
        comment: regexFunc.getComment(text)
      }
      setDataToStates(orderInfo)
    } catch (err) {
      console.log(err)
      Toast.fail(err.message, 1000)
    }
  }

  function calcAndPrintFees() {
    return regexHelpers.printFees(
      calculations.calculateFees(
        order.date.original, 
        order.time, 
        order.paymentType
      )
    )
  }

  function handleEditorFormatting() {
    const fees = calcAndPrintFees()
    const editedOrder = {...order, fees }
    setDataToStates(editedOrder)
  }

  function setDataToStates(data) {
    setOptions({...options, hsy: data.servicePrice === 40 || data.servicePrice === 70})
    setOrder(data)
    setFormattedConfirmation(makeConvertion(data))
  }

  function handleOrderChange(e) {
    if (e.target.name === 'ISODate') {
      const ISODate = e.target.value
      return setOrder(
        { ...order, 
          date: {
            [e.target.name]: ISODate,
            original: new Date(ISODate),
            confirmationFormat: regexHelpers.toConfirmationDateFormat(ISODate)
          }
        }
      )
    }
    if (e.target.name === 'serviceName') {
      const serviceName = e.target.value
      return setOrder(
        { ...order,
          [e.target.name]: serviceName,
          servicePrice: services.find(service => service.name === serviceName).price
        }
      )
    }
    setOrder({...order, [e.target.name]: e.target.value })
  }

  function handleTextChange(e) {
    setText(e.target.value)
  }

  function handleCustomTextChange(e) {
    setCustomText(e.target.value)
  }
  
  return (
    <div className="flex-container">
      <TextareaAutosize 
        className="textarea-1 flex-item"
        rowsMin={5} 
        cols={40}
        value={custom ? customText : text} 
        placeholder="Order info here."
        onChange={custom ? handleCustomTextChange : handleTextChange} 
      />

      { 
        custom ? 
          <Editor 
            order={order} 
            handleChange={handleOrderChange} 
            handleClick={handleEditorFormatting}
          /> 
        : null 
      }

      <TextareaAutosize
        className="textarea-2 flex-item"
        rowsMin={5} 
        cols={40}
        ref={textAreaRef} 
        value={formattedConfirmation} 
        placeholder="Formatted confirmation will be outputted here."
        onChange={(e) => setFormattedConfirmation(e.target.value)}
      />
      <div className="flex-100-space-between">
        { 
          custom ? null : 
            <EditModal 
              handleChange={handleOrderChange} 
              handleFormatting={handleEditorFormatting} 
              order={order} 
            />
        }

        {
          custom ? null :
            <TransformButton handleClick={handleFormatting} />
        }

        <CopyButton
          inputRef={textAreaRef}
        />
      </div>

      <CheckboxGroup handleChange={handleOptionsChange} options={options} />

      <ValidationErrorsDisplay error={error} order={order} custom={custom} confirmation={formattedConfirmation} handleSetError={handleSetError}/>

      <div className="send-button-container">
        <div className='small-button-container'>
          <InputModal
            handleChange={handleOrderChange}
            label={"Email"}
            name={"email"}
            value={order.email}
          />
          <SendEmailButton 
            err={error}
            disabled={ order.email && formattedConfirmation ? false : true }
            handleClick={handleEmailSending}
          />
        </div>

        <div className='small-button-container'>
          <InputModal
            handleChange={handleOrderChange}
            label={"SMS"}
            name={"phone"}
            value={order.phone}
          />
          <SendSMSButton
            err={error} 
            disabled={ order.phone && formattedConfirmation ? false : true }
            phoneNumber={order.phone}
            msgBody={formattedConfirmation}
          />
        </div>
        <AddToCalendarButton
          handleClick={handleAddingToCalendar}
          err={error}
        />
      </div>
      <div style={{ maxWidth: 900, display: 'flex', flexFlow: 'column wrap' }}>
        <p>{JSON.stringify(order)}</p>
      </div>
    </div>
  )
}
