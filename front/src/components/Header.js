import React, { useEffect } from 'react'
import { Link, Route, useRouteMatch } from 'react-router-dom'
import '../styles/logo.css'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import logo from '../assets/paku24-logo.png'

export default function Header({ isLogged, custom, setCustom, handleChange }) {
  const customOrderMatch = useRouteMatch('/custom')?.url
  useEffect(() => {
    // eslint-disable-next-line no-unused-expressions
    customOrderMatch && setCustom(true)
  }, [customOrderMatch])

  return (
    <div className="logo">
      <div>
        <Link to={isLogged ? '/' : '/login'}>
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
