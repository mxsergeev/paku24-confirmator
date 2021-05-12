import React, { useState, useEffect } from 'react'
import { Route, Switch, Redirect, useHistory } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import Confirmator from './components/Confirmator'
import Header from './components/Header'
import Login from './components/Login'
import Register from './components/Register'
import loginServiсe from './services/login'
import './styles/container.css'
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

function AuthenticateUser({ user, setUser, children }) {
  const history = useHistory()
  let currentLocation
  if (user === null || user === 'Loading') {
    currentLocation = history.location.pathname
  }

  useEffect(async () => {
    try {
      const { user: userFromToken } = await loginServiсe.loginWithAccessToken()

      return setUser(userFromToken)
    } catch (err) {
      return setUser(null)
    }
  }, [])

  const loading = user === 'Loading'
  const mustRedirect = user === null
  const redirectToLoginPage = mustRedirect && (
    <Redirect
      to={{ pathname: '/login', state: { referrer: currentLocation } }}
    />
  )

  return (
    <>
      <LoadingUntillDone
        loading={loading}
        redirectComponent={redirectToLoginPage}
      >
        {children}
      </LoadingUntillDone>

      <Route path="/login">
        {user === null ? <Login setUser={setUser} /> : <Redirect to="/" />}
      </Route>
    </>
  )
}

function App() {
  const [user, setUser] = useState('Loading')
  const [custom, setCustom] = useState(false)

  // Initializing Axios interceptor with ability to logout user
  useEffect(() => {
    interceptor.setupInterceptor({ logout: () => setUser(null) })
  }, [])

  const history = useHistory()

  function handleCustomChange(e) {
    const { checked } = e.target
    setCustom(checked)

    return checked ? history.push('/custom') : history.push('/')
  }

  return (
    <div className="container">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Header
          isLogged={user !== null && user !== 'Loading'}
          custom={custom}
          setCustom={setCustom}
          handleChange={handleCustomChange}
        />
        <Switch>
          <Route path="/register">
            <Register />
          </Route>
          <Route path="/">
            <AuthenticateUser user={user} setUser={setUser}>
              <Confirmator custom={custom} />
              <Footer user={user} logoutUser={() => setUser(null)} />
            </AuthenticateUser>
          </Route>
        </Switch>
      </ErrorBoundary>
    </div>
  )
}

export default App
