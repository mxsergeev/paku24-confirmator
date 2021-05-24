import React, { useState, useEffect } from 'react'
import { Route, Switch, Redirect, useHistory } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { useSnackbar } from 'notistack'
import Confirmator from './components/Confirmator/Confirmator'
import Header from './components/Header'
import Login from './components/Login'
import Register from './components/Register'
import loginServiсe from './services/login'
import './App.css'
import Footer from './components/Footer'
import LoadingUntillDone from './components/LoadingUntillDone'
import interceptor from './services/interceptor'

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  )
}

function RedirectToLoginPageIfNotAuthenticated({ user, setUser, children }) {
  const history = useHistory()
  let currentLocation
  if (user === null || user === 'Loading') {
    currentLocation = history.location.pathname
  }

  const loading = user === 'Loading'
  const mustRedirect = user === null
  const redirectToLoginPage = mustRedirect && (
    <Redirect to={{ pathname: '/login', state: { referrer: currentLocation } }} />
  )

  return (
    <>
      <LoadingUntillDone loading={loading} redirectComponent={redirectToLoginPage}>
        {children}
      </LoadingUntillDone>

      <Route path="/login">
        {user === null ? <Login setUser={setUser} /> : <Redirect to="/confirmator" />}
      </Route>
    </>
  )
}

function App() {
  const [user, setUser] = useState('Loading')

  const { enqueueSnackbar } = useSnackbar()
  const history = useHistory()

  useEffect(async () => {
    // Initializing Axios interceptor with ability to logout user
    interceptor.setupInterceptor({
      logout: () => setUser(null),
      notificate: () =>
        enqueueSnackbar(
          'You were logged out for security reasons. Your work has been saved. Login to continue.',
          {
            variant: 'warning',
            autoHideDuration: 10000,
          }
        ),
    })

    try {
      const { user: userFromToken } = await loginServiсe.loginWithAccessToken()
      history.push('/confirmator')
      return setUser(userFromToken)
    } catch (err) {
      return setUser(null)
    }
  }, [])

  return (
    <div className="container">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Header isLogged={user !== null && user !== 'Loading'} />
        <Switch>
          <Route path="/register">
            <Register />
          </Route>
          <Route path="/">
            <RedirectToLoginPageIfNotAuthenticated user={user} setUser={setUser}>
              <Route path="/confirmator">
                <Confirmator />
                <Footer user={user} logoutUser={() => setUser(null)} />
              </Route>
            </RedirectToLoginPageIfNotAuthenticated>
          </Route>
        </Switch>
      </ErrorBoundary>
    </div>
  )
}

export default App
