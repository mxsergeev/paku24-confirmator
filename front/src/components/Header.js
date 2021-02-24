import React from 'react'
import { Link, Route } from 'react-router-dom'
import '../styles/logo.css'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import logo from '../assets/paku24-logo.png'

export default function Header({ isLogged, custom, handleChange }) {
  return (
    <div className="logo">
      <div>
        <Link to="/">
          <img src={logo} alt="Logo" width="125px" />
        </Link>
        <span className="text">CONFIRMATOR</span>
      </div>
      <Route exact path={['/', '/custom/:slug*']}>
        {isLogged && (
          <FormControlLabel
            style={{ margin: 0, alignSelf: 'center' }}
            control={
              <Switch
                checked={custom}
                onChange={handleChange}
                color="default"
              />
            }
          />
        )}
      </Route>
    </div>
  )
}
