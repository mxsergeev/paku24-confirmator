import React from 'react'
import '../styles/logo.css'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import logo from '../assets/paku24-logo.png'

export default function Header({ custom, handleChange }) {
  return (
    <div className="logo">
      <div>
        <img src={logo} alt="Logo" width="125px" />
        <span className="text">CONFIRMATOR</span>
      </div>
      {/* logged ? <FormControlLabel : null */}
      <FormControlLabel
        style={{ margin: 0, alignSelf: 'center' }}
        control={
          <Switch checked={custom} onChange={handleChange} color="default" />
        }
      />
    </div>
  )
}
