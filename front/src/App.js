import React, { useState, useEffect } from 'react'
import {
  Switch,
  Route,
  useHistory,
  useLocation,
  useRouteMatch,
} from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import Convert from './components/Convert'
// import loginServiсe from './services/login'
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
  const history = useHistory()
  const location = useLocation()

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
    const { checked } = e.target
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
        <Switch>
          <Route path="/login">
            <Login
              isLogged={isLogged}
              handleIsLoggedChange={handleIsLoggedChange}
            />
          </Route>

          <Route exact path="/*">
            <Convert custom={custom} />
          </Route>
        </Switch>
      </ErrorBoundary>
    </div>
  )
}

export default App
