import React, { useState, useRef } from 'react'
import * as regexFunc from '../utils/regexFunctions'
// import Notification from './Notification'
import Toast from 'light-toast';

export default function Convert({ text, setText }) {
  const [format, setFormat] = useState('')
  // const [notificationMsg, setNotificationMsg] = useState(null)
  const textAreaRef = useRef(null)
  
  function copyToClipboard(e) {
    textAreaRef.current.select()
    document.execCommand('copy')
    e.target.focus()
  }

  // function setNotification(errMsg, isError = true) {
  //   setNotificationMsg({ error: isError, message: errMsg })
  //   setTimeout(() => setNotificationMsg(null), 3000)
  // }

  function makeConvertion(str) {
    let converted
    try {
      converted = 
`VARAUSVAHVISTUS
VARAUKSEN TIEDOT
${regexFunc.getStartingTime(str).date}
ALKAMISAIKA
Klo ${regexFunc.getStartingTime(str).time} (+/-15min)
ARVIOITU KESTO
${regexFunc.getDuration(str)}h (${regexFunc.getService(str).price}€/h, ${regexFunc.getService(str).name})
MAKSUTAPA
${regexFunc.getPaymentType(str).name} ${regexFunc.getPaymentType(str).fee ? regexFunc.getPaymentType(str).comment : ''}${
  regexFunc.getFees(str)
  .filter(fee => fee.value !== false)
  .map(fee => regexFunc.printFee(fee))
}
AUTON TOIMITUS
${regexFunc.getAdress(str, 'Frome').adress} ${regexFunc.getAdress(str, 'Frome').city}${regexFunc.getAdress(str, 'To').adress ? '\nMÄÄRÄNPÄÄ\n' : ''}${regexFunc.getAdress(str, 'To').adress} ${regexFunc.getAdress(str, 'To').city}
NIMI
${regexFunc.getName(str)}
SÄHKÖPOSTI
${regexFunc.getEmail(str)}
PUHELIN
${regexFunc.getPhone(str)}
${regexFunc.getComment(str) ? 'LISÄTIETOJA' : ''}${regexFunc.getComment(str)}
KIITOS VARAUKSESTANNE!`
      // setNotification('Succesefully formatted!', false)
      Toast.info('Succesefully formatted!', 500)
    } catch (err) {
      console.error(err)
      // setNotification(err.message)
      Toast.fail(err.message, 1000)
    }
    return (
      converted
    )
  }
  return (
    <>
    {/* <Notification notification={notificationMsg} /> */}
    <textarea rows="40" cols="40" onChange={(e) => { setText(e.target.value) }}></textarea>
    <button onClick={() => {
      // console.log('Starting time:', regexFunc.getStartingTime(text))
      // console.log('Duration:', regexFunc.getDuration(text))
      // console.log("FEES:", regexFunc.getFees(text))
      // console.log('Service:', regexFunc.getService(text))
      // console.log('Payment type:', regexFunc.getPaymentType(text))
      // console.log('Starting Adress:', regexFunc.getAdress(text, 'Frome'))
      // console.log('Destination Adress:', regexFunc.getAdress(text, 'To'))
      // console.log('Name:', regexFunc.getName(text))
      // console.log('Email:', regexFunc.getEmail(text))
      // console.log('Phonenumber', regexFunc.getPhone(text))
      // console.log('Comment:', regexFunc.getComment(text))
      setFormat(makeConvertion(text))
    }}>
      Format
    </button>
    <textarea rows="40" cols="40" ref={textAreaRef} value={format} onChange={(e) => { setFormat(e.target.value) }}></textarea>
    <button onClick={(e) => {
      copyToClipboard(e)
      // setNotification('Copied!', false)
      Toast.info('Copied!', 500)
    }}>Copy</button>
    </>
  )
}
