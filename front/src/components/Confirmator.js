/* eslint-disable prefer-template */
import React, { useState, useRef, useMemo, useEffect, useReducer } from 'react'
import { Route } from 'react-router-dom'
import Toast from 'light-toast'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'

import '../styles/confirmator.css'
import InputModal from './InputModal'
import EditDialog from './EditDialog'
import Editor from './Editor'

import sendConfirmationEmail from '../services/emailAPI'
import addEventToCalendar from '../services/calendarAPI'
import sendSMS from '../services/smsAPI'
import * as regexFunc from '../utils/regexFunctions'
import * as regexHelpers from '../utils/helpers/regexHelpers'
import calculateFees from '../utils/helpers/calculateFees'
import services from '../utils/services.json'

import TransformButton from './buttons/TransformButton'
import CopyButton from './buttons/CopyButton'
import CheckboxGroup from './CheckboxGroup'
import SendSMSButton from './buttons/SendSMSButton'
import SendEmailButton from './buttons/SendEmailButton'
import AddToCalendarButton from './buttons/AddToCalendarButton'
import NewOrderButton from './buttons/NewOrderButton'
import ValidationErrorsDisplay from './ValidationErrorsDisplay'

function makeConvertion(order) {
  let converted
  try {
    converted = `VARAUKSEN TIEDOT
${order.date.confirmationFormat}
ALKAMISAIKA
Klo ${order.time} (+/-15min)
ARVIOITU KESTO
${order.duration}h (${order.servicePrice}€/h, ${order.serviceName})
MAKSUTAPA
${order.paymentType}${order.fees.string}
LÄHTÖPAIKKA
${order.address}
${order.destination.length > 5 ? `MÄÄRÄNPÄÄ\n${order.destination}\n` : ''}NIMI
${order.name}
${order.email ? `SÄHKÖPOSTI\n${order.email}\n` : ''}PUHELIN
${order.phone}
${order.comment ? `LISÄTIETOJA\n${order.comment}\n` : ''}`
    Toast.info('Succesefully formatted!', 500)
  } catch (err) {
    Toast.fail(err.message, 1000)
  }
  return converted
}

export default function Confirmator({ custom }) {
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

  const CHANGE_ACTIONS_STATUS_EMAIL = 'CHANGE_ACTIONS_STATUS_EMAIL'
  const CHANGE_ACTIONS_STATUS_SMS = 'CHANGE_ACTIONS_STATUS_SMS'
  const CHANGE_ACTIONS_STATUS_CALENDAR = 'CHANGE_ACTIONS_STATUS_CALENDAR'
  const CHANGE_ACTIONS_STATUS_ERROR = 'CHANGE_ACTIONS_STATUS_ERROR'
  const CHANGE_ACTIONS_STATUS_RESET = 'CHANGE_ACTIONS_STATUS_RESET'

  const initialOrderActionsStatus = {
    email: {
      status: null,
      disable: false,
    },
    sms: {
      status: null,
      disable: false,
    },
    calendar: {
      status: null,
      disable: false,
    },
    error: false,
  }

  function initOrderActionsStatus(initialStatus) {
    return initialStatus
  }

  function reducer(state, action) {
    switch (action.type) {
      case 'CHANGE_ACTIONS_STATUS_EMAIL':
        return { ...state, email: action.payload }
      case 'CHANGE_ACTIONS_STATUS_SMS':
        return { ...state, sms: action.payload }
      case 'CHANGE_ACTIONS_STATUS_CALENDAR':
        return { ...state, calendar: action.payload }
      case 'CHANGE_ACTIONS_STATUS_ERROR':
        return { ...state, error: action.payload }
      case 'CHANGE_ACTIONS_STATUS_RESET':
        return initOrderActionsStatus(initialOrderActionsStatus)
      default:
        throw new Error()
    }
  }

  const [orderActionsStatus, dispatchOrderActionsStatus] = useReducer(
    reducer,
    initialOrderActionsStatus,
    initOrderActionsStatus
  )

  function changeEmailStatus(status, disable) {
    dispatchOrderActionsStatus({
      type: CHANGE_ACTIONS_STATUS_EMAIL,
      payload: { status, disable },
    })
  }
  function changeCalendarStatus(status, disable) {
    dispatchOrderActionsStatus({
      type: CHANGE_ACTIONS_STATUS_CALENDAR,
      payload: { status, disable },
    })
  }
  function changeSMSStatus(status, disable) {
    dispatchOrderActionsStatus({
      type: CHANGE_ACTIONS_STATUS_SMS,
      payload: { status, disable },
    })
  }

  const defaultOptions = useMemo(
    () => ({
      distance: 'insideCapital',
      hsy: false,
      secondCar: false,
      XL: false,
    }),
    []
  )
  const [options, setOptions] = useState(defaultOptions)

  const textAreaRef = useRef(null)

  function reset() {
    setText('')
    setOrder(defaultOrder)
    setOptions(defaultOptions)
    setFormattedConfirmation('')
    dispatchOrderActionsStatus({ type: CHANGE_ACTIONS_STATUS_RESET })
  }

  useEffect(() => {
    reset()
  }, [custom])

  useEffect(
    () =>
      setOptions({
        ...options,
        hsy:
          order.serviceName === 'Paku ja mies' ||
          order.serviceName === 'Paku ja kaksi miestä',
      }),
    [order.serviceName]
  )

  function handleOptionsChange(e) {
    setOptions({
      ...options,
      [e.target.name]: e.target.value || e.target.checked,
    })
  }

  function handleEmailSending() {
    if (order.email && formattedConfirmation) {
      changeEmailStatus('Waiting', true)
      return sendConfirmationEmail({
        confirmation: formattedConfirmation,
        options,
        email: order.email,
      })
        .then((res) => {
          changeEmailStatus('Done', true)
          Toast.info(res, 500)
        })
        .catch((err) => {
          changeEmailStatus('Error', false)
          Toast.fail(err.response.data.error)
        })
    }
    return Toast.fail('No confirmation found or recipients defined.', 1000)
  }

  async function handleSendingSMS() {
    try {
      const msg = formattedConfirmation
      if (msg) {
        changeSMSStatus('Waiting', true)
        const response = await sendSMS({ msg, phone: order.phone })
        changeSMSStatus('Done', true)
        Toast.info(`${response.message}`, 3000)
      }
    } catch (err) {
      changeSMSStatus('Error', false)
      Toast.fail(err.response?.data.error, 2000)
    }
  }

  async function handleAddingToCalendar() {
    try {
      const entry = await regexFunc.getEventForCalendar(
        formattedConfirmation,
        order.address
      )
      if (entry) {
        changeCalendarStatus('Waiting', true)
        const response = await addEventToCalendar(entry, order, options)
        changeCalendarStatus('Done', true)
        Toast.info(`${response.message}\n${response.createdEvent}`, 3000)
      }
    } catch (err) {
      changeCalendarStatus('Error', false)
      Toast.fail(err.response?.data.error, 2000)
    }
  }

  function setDataToStates(data) {
    setOrder(data)
    setFormattedConfirmation(makeConvertion(data))
  }

  function handleFormatting() {
    try {
      const cleanedText = regexFunc.initialCleanup(text)
      const serviceName = regexFunc.getService(cleanedText).name
      const service = services.find((s) => s.name === serviceName)
      const servicePrice = options.XL ? service.priceXL : service.price

      const date = regexFunc.getStartingTime(cleanedText)
      const beginAddress = regexFunc.getAddress(cleanedText, 'Frome')
      const endAddress = regexFunc.getAddress(cleanedText, 'To')

      const address = `${beginAddress.address},${
        beginAddress.postalCode ? ' ' + beginAddress.postalCode : ''
      } ${beginAddress.city}`
      const destination = `${endAddress.address || ''},${
        endAddress.postalCode ? ' ' + endAddress.postalCode : ''
      } ${endAddress.city || ''}`

      const orderInfo = {
        date: {
          original: date.original,
          ISODate: date.ISODate,
          confirmationFormat: date.confirmationFormat,
        },
        time: regexFunc.getStartingTime(cleanedText).time,
        duration: regexFunc.getDuration(cleanedText),
        serviceName,
        servicePrice: servicePrice || regexFunc.getService(cleanedText).price,
        paymentType: regexFunc.getPaymentType(cleanedText),
        fees: regexHelpers.printFees(regexFunc.getFees(cleanedText)),
        address,
        destination,
        name: regexFunc.getName(cleanedText),
        email: regexFunc.getEmail(cleanedText),
        phone: regexFunc.getPhone(cleanedText),
        comment: regexFunc.getComment(cleanedText),
      }
      setDataToStates(orderInfo)
    } catch (err) {
      Toast.fail(err.message, 1000)
    }
  }

  function calcAndPrintFees() {
    return regexHelpers.printFees(
      calculateFees(order.date.original, order.time, order.paymentType)
    )
  }

  function handleEditorFormatting() {
    const fees = calcAndPrintFees()
    const service = services.find((s) => s.name === order.serviceName)
    const servicePrice = options.XL ? service.priceXL : service.price
    const editedOrder = { ...order, servicePrice, fees }
    setDataToStates(editedOrder)
  }

  function handleOrderChange(e) {
    const { name } = e.target
    if (name === 'ISODate') {
      const ISODate = e.target.value
      return setOrder({
        ...order,
        date: {
          [e.target.name]: ISODate,
          original: new Date(`${ISODate} ${order.time}`),
          confirmationFormat: regexHelpers.toConfirmationDateFormat(ISODate),
        },
      })
    }
    if (name === 'time') {
      return setOrder({
        ...order,
        date: {
          ...order.date,
          original: new Date(`${order.date.ISODate} ${e.target.value}`),
        },
        [name]: e.target.value,
      })
    }
    if (name === 'serviceName') {
      const serviceName = e.target.value
      const service = services.find((s) => s.name === serviceName)
      const servicePrice = service.price
      return setOrder({
        ...order,
        serviceName,
        servicePrice,
      })
    }
    return setOrder({
      ...order,
      [name]: e.target.value,
    })
  }

  function handleTextChange(e) {
    setText(e.target.value)
  }

  function handleCustomTextChange(e) {
    setCustomText(e.target.value)
  }

  return (
    <div className="flex-container">
      <Route exact path={['/', '/edit/:slug*']}>
        <TextareaAutosize
          className="textarea-1 flex-item"
          rowsMin={5}
          cols={40}
          value={custom ? customText : text}
          placeholder="Order info here."
          onChange={custom ? handleCustomTextChange : handleTextChange}
        />
      </Route>

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
          <EditDialog
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
        order={order}
        custom={custom}
        confirmation={formattedConfirmation}
        dispatchOrderActionsStatus_error={(err) =>
          dispatchOrderActionsStatus({
            type: CHANGE_ACTIONS_STATUS_ERROR,
            payload: err,
          })
        }
      />

      <div className="send-button-container">
        <div className="small-button-container">
          <InputModal
            disabled={orderActionsStatus.email.disable}
            custom={custom}
            handleChange={handleOrderChange}
            label="Email"
            name="email"
            value={order.email}
          />
          <SendEmailButton
            statusText={orderActionsStatus.email.status}
            disabled={
              orderActionsStatus.error ||
              orderActionsStatus.email.disable ||
              !(order.email && formattedConfirmation)
            }
            handleClick={handleEmailSending}
          />
        </div>
        <div className="small-button-container">
          <InputModal
            disabled={orderActionsStatus.sms.disable}
            custom={custom}
            handleChange={handleOrderChange}
            label="SMS"
            name="phone"
            value={order.phone}
          />
          <SendSMSButton
            statusText={orderActionsStatus.sms.status}
            disabled={
              orderActionsStatus.error ||
              orderActionsStatus.sms.disable ||
              !(order.phone && formattedConfirmation)
            }
            handleClick={handleSendingSMS}
          />
        </div>
        <div className="small-button-container">
          <AddToCalendarButton
            handleClick={handleAddingToCalendar}
            statusText={orderActionsStatus.calendar.status}
            disabled={
              orderActionsStatus.error ||
              orderActionsStatus.calendar.disable ||
              !formattedConfirmation
            }
          />
        </div>
      </div>
      <NewOrderButton handleClick={reset} />
    </div>
  )
}
