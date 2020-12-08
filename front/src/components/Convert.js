import React, { useState, useRef } from 'react'
import Toast from 'light-toast'
import sendConfirmationEmail from '../services/emailAPI'
import addEventToCalendar from '../services/calendarAPI'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import '../styles/convert.css'
import InputModal from './InputModal'
import EditModal from './EditModal'
import * as regexFunc from '../utils/regexFunctions'
import * as regexHelpers from '../utils/helpers/regexHelpers'

import TransformButton from './buttons/TransformButton'
import CopyButton from './buttons/CopyButton'
import CheckboxGroup from './CheckboxGroup'
import SendSMSButton from './buttons/SendSMSButton'
import SendEmailButton from './buttons/SendEmailButton'
import AddToCalendarButton from './buttons/AddToCalendarButton'
import ValidationErrorsDisplay from './ValidationErrorsDisplay'

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
${order.paymentType}${order.fees?.string}
LÄHTÖPAIKKA
${order.address}${order.destination.length > 1 ? '\nMÄÄRÄNPÄÄ\n' : ''}${order.destination}
NIMI
${order.name}
SÄHKÖPOSTI
${order.email}
PUHELIN
${order.phone}
${order.comment ? 'LISÄTIETOJA' : ''}${order.comment}
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

export default function Convert() {
  const [text, setText] = useState('')
  const [formattedConfirmation, setFormattedConfirmation] = useState('')
  const [order, setOrder] = useState({
    date: {
      original: new Date(),
      ISODate: new Date().toISOString().split('T')[0],
      confirmationFormat: regexHelpers.toConfirmationDateFormat(new Date()),
    },
    time: `${new Date().toTimeString().split(':')[0]}:${new Date().toTimeString().split(':')[1]}`,
    duration: 1, 
    serviceName: '',
    servicePrice: '',
    paymentType: 'Maksukortti',
    fees: '',
    address: '',
    destination: '',
    name: '',
    email: '',
    phone: '',
    comment: '',
  })
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [options, setOptions] = useState({ distance: 'insideCapital', hsy: false })
  const textAreaRef = useRef(null)

  function handleOptionsChange(e) {
    if (e.target.name && e.target.name === 'hsy') {
      return setOptions({ ...options, hsy: e.target.checked })
    }
    setOptions({ ...options, distance: e.target.value })
  }

  function handleEmailSending() {
    if (email && formattedConfirmation) {
      return sendConfirmationEmail(formattedConfirmation, options, email)
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
      setEmail(orderInfo.email)
      setPhoneNumber(orderInfo.phone)
      setOrder(orderInfo)
      setFormattedConfirmation(makeConvertion(orderInfo))
    } catch (err) {
      console.log(err)
      Toast.fail(err.message, 1000)
    }
    console.log(orderInfo)
  }

  function handleEditorFormatting(data) {
    setEmail(data.email)
    setPhoneNumber(data.phone)
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
    setOrder({...order, [e.target.name]: e.target.value })
  }

  function handelEmailChange(e) {
    setEmail(e.target.value)
  }

  function handlePhoneNumberChange(e) {
    setPhoneNumber(e.target.value)
  }
  
  return (
    <div className="flex-container">
      <TextareaAutosize 
        className="textarea-1 flex-item"
        rowsMin={5} 
        cols={40} 
        placeholder="Order info here."
        onChange={(e) => { setText(e.target.value) }} 
      />

      <TextareaAutosize
        className="textarea-2 flex-item"
        rowsMin={5} 
        cols={40}
        ref={textAreaRef} 
        value={formattedConfirmation} 
        placeholder="Formatted confirmation will be outputted here."
        onChange={(e) => { setFormattedConfirmation(e.target.value) }}
      />

      <EditModal 
        handleChange={handleOrderChange} 
        handleEditorFormatting={handleEditorFormatting} 
        order={order} 
      />

      <TransformButton 
        handleClick={() => handleFormatting()}
      />

      <CopyButton
        inputRef={textAreaRef}
      />

      <CheckboxGroup handleChange={handleOptionsChange} options={options} />

      <ValidationErrorsDisplay order={order} />

      <div className="send-button-container">
        <div className='small-button-container'>
          <InputModal
            handleChange={handelEmailChange}
            label={"Email"}
            value={email}
          />
          <SendEmailButton 
            handleClick={handleEmailSending}
          />
        </div>

        <div className='small-button-container'>
          <InputModal
            handleChange={handlePhoneNumberChange}
            label={"SMS"}
            value={phoneNumber}
          />
          <SendSMSButton 
            phoneNumber={phoneNumber}
            msgBody={formattedConfirmation}
          />
        </div>
        <AddToCalendarButton
          handleClick={handleAddingToCalendar}
        />
      </div>
      <div style={{ width: 500, display: 'flex', flexFlow: 'column wrap' }}>
        <p>{JSON.stringify(order)}</p>
      </div>
    </div>
  )
}
