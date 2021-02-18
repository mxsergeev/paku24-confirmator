import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Route } from 'react-router-dom'
import Toast from 'light-toast'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import sendConfirmationEmail from '../services/emailAPI'
import addEventToCalendar from '../services/calendarAPI'
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

function makeConvertion(order) {
  let converted
  try {
    converted = `VARAUSVAHVISTUS
VARAUKSEN TIEDOT
${order.date.confirmationFormat}
ALKAMISAIKA
Klo ${order.time} (+/-15min)
ARVIOITU KESTO
${order.duration}h (${order.servicePrice}€/h, ${order.serviceName})
MAKSUTAPA
${order.paymentType}${order.fees.string}
LÄHTÖPAIKKA
${order.address}
${order.destination.length > 1 ? `MÄÄRÄNPÄÄ\n${order.destination}\n` : ''}NIMI
${order.name}
${order.email ? `SÄHKÖPOSTI\n${order.email}\n` : ''}PUHELIN
${order.phone}
${order.comment ? `LISÄTIETOJA\n${order.comment}\n` : ''}
KIITOS VARAUKSESTANNE!`
    Toast.info('Succesefully formatted!', 500)
  } catch (err) {
    console.log(err)
    Toast.fail(err.message, 1000)
  }
  return converted
}

export default function Convert({ custom }) {
  const [text, setText] = useState('')
  const [customText, setCustomText] = useState('')
  const [formattedConfirmation, setFormattedConfirmation] = useState('')
  const defaultOrder = useMemo(
    () => ({
      date: {
        original: new Date(),
        ISODate: new Date().toISOString().split('T')[0],
        confirmationFormat: regexHelpers.toConfirmationDateFormat(new Date()),
      },
      time: `${new Date().toTimeString().split(':')[0]}:${
        new Date().toTimeString().split(':')[1]
      }`,
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
    }),
    []
  )
  const [order, setOrder] = useState(defaultOrder)

  const defaultOptions = useMemo(
    () => ({
      distance: 'insideCapital',
      hsy: order.servicePrice === 40 || order.servicePrice === 70,
      XL: false,
    }),
    [order.servicePrice]
  )
  const [options, setOptions] = useState(defaultOptions)

  const [error, setError] = useState(false)
  const textAreaRef = useRef(null)

  useEffect(() => {
    setOrder(defaultOrder)
    setOptions(defaultOptions)
    setFormattedConfirmation('')
  }, [custom, defaultOrder, defaultOptions])

  const handleSetError = useCallback((bool) => setError(bool), [])

  function handleOptionsChange(e) {
    setOptions({
      ...options,
      [e.target.name]: e.target.value || e.target.checked,
    })
  }

  function handleEmailSending() {
    if (order.email && formattedConfirmation) {
      return sendConfirmationEmail(formattedConfirmation, options, order.email)
        .then((res) => Toast.info(res, 500))
        .catch((err) => Toast.fail(err.response.data.error))
    }
    return Toast.fail('No confirmation found or recipients defined.', 1000)
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

  function setDataToStates(data) {
    setOptions({
      ...options,
      hsy: data.servicePrice === 40 || data.servicePrice === 70,
    })
    setOrder(data)
    setFormattedConfirmation(makeConvertion(data))
  }

  function handleFormatting() {
    let orderInfo
    try {
      orderInfo = {
        date: {
          original: regexFunc.getStartingTime(text).original,
          ISODate: regexFunc.getStartingTime(text).ISODate,
          confirmationFormat: regexFunc.getStartingTime(text)
            .confirmationFormat,
        },
        time: regexFunc.getStartingTime(text).time,
        duration: regexFunc.getDuration(text),
        serviceName: regexFunc.getService(text).name,
        servicePrice: regexFunc.getService(text).price,
        paymentType: regexFunc.getPaymentType(text),
        fees: regexHelpers.printFees(regexFunc.getFees(text)),
        address: `${regexFunc.getAddress(text, 'Frome').address} ${
          regexFunc.getAddress(text, 'Frome').city
        }`,
        destination: `${regexFunc.getAddress(text, 'To').address} ${
          regexFunc.getAddress(text, 'To').city
        }`,
        name: regexFunc.getName(text),
        email: regexFunc.getEmail(text),
        phone: regexFunc.getPhone(text),
        comment: regexFunc.getComment(text),
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
    const editedOrder = { ...order, fees }
    setDataToStates(editedOrder)
  }

  function handleOrderChange(e) {
    if (e.target.name === 'ISODate') {
      const ISODate = e.target.value
      return setOrder({
        ...order,
        date: {
          [e.target.name]: ISODate,
          original: new Date(ISODate),
          confirmationFormat: regexHelpers.toConfirmationDateFormat(ISODate),
        },
      })
    }
    if (e.target.name === 'serviceName') {
      const serviceName = e.target.value
      return setOrder({
        ...order,
        [e.target.name]: serviceName,
        servicePrice: services.find((service) => service.name === serviceName)
          .price,
      })
    }
    return setOrder({ ...order, [e.target.name]: e.target.value })
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

      <Route path="/custom">
        <Editor
          order={order}
          handleChange={handleOrderChange}
          handleClick={handleEditorFormatting}
        />
      </Route>

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
        <Route exact path={['/', '/edit/:slug*']}>
          <EditModal
            handleChange={handleOrderChange}
            handleFormatting={handleEditorFormatting}
            order={order}
          />
          <TransformButton handleClick={handleFormatting} />
        </Route>

        <CopyButton inputRef={textAreaRef} />
      </div>

      <CheckboxGroup handleChange={handleOptionsChange} options={options} />

      <ValidationErrorsDisplay
        error={error}
        order={order}
        custom={custom}
        confirmation={formattedConfirmation}
        handleSetError={handleSetError}
      />

      <div className="send-button-container">
        <div className="small-button-container">
          <InputModal
            handleChange={handleOrderChange}
            label="Email"
            name="email"
            value={order.email}
          />
          <SendEmailButton
            err={error}
            disabled={!(order.email && formattedConfirmation)}
            handleClick={handleEmailSending}
          />
        </div>

        <div className="small-button-container">
          <InputModal
            handleChange={handleOrderChange}
            label="SMS"
            name="phone"
            value={order.phone}
          />
          <SendSMSButton
            err={error}
            disabled={!(order.phone && formattedConfirmation)}
            phoneNumber={order.phone}
            msgBody={formattedConfirmation}
          />
        </div>
        <AddToCalendarButton handleClick={handleAddingToCalendar} err={error} />
      </div>

      {/* <Redirect to='/' /> */}
    </div>
  )
}
