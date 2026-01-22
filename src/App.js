import React, { useState, useEffect } from 'react'
import { Route, Switch, Redirect, useHistory } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { enqueueSnackbar } from 'notistack'
import Hub from './components/Hub'
import Confirmator from './components/Confirmator/Confirmator'
import Statistics from './components/Statistics/Statistics'
import Header from './components/Header'
import Login from './components/Login'
import Register from './components/Register'
import loginService from './services/login'
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

function ProtectedRoute({ dependsOn, path, children, ...rest }) {
  const history = useHistory()
  let currentLocation
  if (dependsOn === null || dependsOn === 'Loading') {
    currentLocation = history.location.pathname
  }

  const loading = dependsOn === 'Loading'
  const mustRedirect = dependsOn === null
  const redirectToLoginPage = mustRedirect && (
    <Redirect to={{ pathname: '/login', state: { referrer: currentLocation } }} />
  )

  return (
    <>
      <LoadingUntillDone loading={loading} redirectComponent={redirectToLoginPage}>
        <Route {...rest} path={path}>
          {children}
        </Route>
      </LoadingUntillDone>
    </>
  )
}

function App() {
  const [user, setUser] = useState('Loading')

  const history = useHistory()

  useEffect(() => {
    async function init() {
      let referrer
      if (user === null || user === 'Loading') {
        referrer = history.location.pathname
      }

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
        const { user: userFromToken } = await loginService.loginWithAccessToken()
        history.push(referrer)
        return setUser(userFromToken)
      } catch (err) {
        return setUser(null)
      }
    }

    init()
    // `user` and `history` are omitted to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Header isLogged={user !== null && user !== 'Loading'} />
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Switch>
          <Route path="/register">
            <Register />
          </Route>
          <Route path="/login">
            {user === null ? <Login updateUser={setUser} /> : <Redirect to="/" />}
          </Route>

          <ProtectedRoute dependsOn={user} path={['/confirmator/:id', '/confirmator']}>
            <Confirmator />
          </ProtectedRoute>
          <ProtectedRoute dependsOn={user} path="/statistics">
            <Statistics />
          </ProtectedRoute>
          <ProtectedRoute dependsOn={user} exact path="/">
            <Hub />
          </ProtectedRoute>
        </Switch>
        <ProtectedRoute dependsOn={user} path="/">
          <Footer user={user} logoutUser={() => setUser(null)} />
        </ProtectedRoute>
      </ErrorBoundary>
    </>
  )
}

export default App
