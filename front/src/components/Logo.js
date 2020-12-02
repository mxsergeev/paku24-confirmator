import React from 'react'
import logo from '../assets/paku24-logo.png'
import '../styles/logo.css'

export default function Logo() {

  return (
    <div className='logo'>
      <img src={logo} alt='Logo' width="125px"></img>
      <div className="text">CONFIRMATOR</div>
    </div>
  )
}