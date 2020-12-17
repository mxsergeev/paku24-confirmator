import React from 'react'
import logo from '../assets/paku24-logo.png'
import '../styles/logo.css'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'

export default function Header({ custom, handleChange, logged }) {

  return (
    <div className='logo'>
      <div>
        <img src={logo} alt='Logo' width="125px"></img>
        <span className="text">CONFIRMATOR</span>
      </div>
      {
        logged ? (
          <>
            <FormControlLabel
              style={{ margin: 0, alignSelf: 'center' }}
              // className='switch'
              control={
                <Switch
                  checked={custom}
                  onChange={handleChange}
                  color="default"
                />
              }
            />
            {/* <span>Custom</span> */}
          </>
        ) : null
      }
    </div>
  )
}