import React, { useState, useEffect } from 'react'
import {
  Switch,
  Route,
  useHistory,
  useLocation,
  useRouteMatch,
  Redirect,
} from 'react-router-dom'
import Convert from './components/Convert'
import { ErrorBoundary } from 'react-error-boundary'
import loginServiсe from './services/login'
import Header from './components/Header'
import Login from './components/Login'
import './styles/container.css'

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  )
}

function App() {
  let history = useHistory()
  let location = useLocation()

  useEffect(() => {
    const storedPass = loginServiсe.getStoredPass()
    if (storedPass) {
      console.log('You are already logged in.')
      history.replace('/')
      setIsLogged(true)
    } else {
      history.replace('/login')
    }
  }, [history])

  const [isLogged, setIsLogged] = useState(false)
  const [custom, setCustom] = useState(false)

  function handleIsLoggedChange(boolean) {
    setIsLogged(boolean)
  }

  const match = useRouteMatch('/custom')

  useEffect(() => {
    if (match) return setCustom(true)
    return setCustom(false)
  }, [location.pathname, match])

  function handleCustomChange(e) {
    const checked = e.target.checked
    setCustom(checked)

    if (checked) return history.push('/custom')
    return history.push('/')
  }

  return (
    <div className="container">
      <Header
        custom={custom}
        handleChange={handleCustomChange}
        logged={isLogged}
      />

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {/* {isLogged ? <Convert custom={custom} /> : <Redirect to='/login' />} */}

        <Switch>
          {/* {isLogged ? <Redirect to='/' /> : <Redirect to='/login' />} */}

          <Route path="/login">
            <Login
              isLogged={isLogged}
              handleIsLoggedChange={handleIsLoggedChange}
            />
          </Route>

          <Route exact path="/:slug*">
            <Convert custom={custom} />
          </Route>
        </Switch>
      </ErrorBoundary>
    </div>
  )
}

export default App
