import React, { useState, useEffect } from 'react'
import { Route, Redirect, useHistory } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import Confirmator from './components/Confirmator'
import Header from './components/Header'
import Login from './components/Login'
import loginServiсe from './services/login'
import logoutService from './services/logout'
import './styles/container.css'

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  )
}

function LoadingUntillDone({
  loading,
  redirectComponent = null,
  targetComponent,
}) {
  return (
    <>
      {loading && <p>Loading...</p>}
      {redirectComponent}
      {!loading && !redirectComponent && targetComponent}
    </>
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
      console.log(err.response?.data || err)
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
        targetComponent={children}
        redirectComponent={redirectToLoginPage}
      />

      <Route path="/login">
        {user === null ? <Login setUser={setUser} /> : <Redirect to="/" />}
      </Route>
    </>
  )
}

function App() {
  const [user, setUser] = useState('Loading')
  const [custom, setCustom] = useState(false)

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
        <AuthenticateUser user={user} setUser={setUser}>
          <Confirmator custom={custom} />
          <button
            type="button"
            onClick={() => logoutService.logout().then(() => setUser(null))}
          >
            Logout
          </button>
        </AuthenticateUser>
      </ErrorBoundary>
    </div>
  )
}

export default App
