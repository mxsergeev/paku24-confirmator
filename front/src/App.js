import React, { useState, useEffect } from 'react'
import { Route, Redirect, useHistory } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import Confirmator from './components/Confirmator'
import Header from './components/Header'
import Login from './components/Login'
import loginServiсe from './services/login'
import tokenService from './services/tokens'
import './styles/container.css'

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
    </div>
  )
}

function LoadingUntillAuthenticated({ user, component }) {
  const loading = user === 'Loading'
  const needsToLogin = user === null

  return (
    <>
      {loading && <p>Loading...</p>}
      {needsToLogin && <Redirect to="/login" />}
      {!loading && !needsToLogin && component}
    </>
  )
}

function AuthenticateUser({ user, setUser, children }) {
  const [refreshAccessTokenAfterMS, setRefreshAccessTokenAfterMS] = useState(
    null
  )

  async function refreshTokens(delay) {
    console.log('Refreshing tokens.')
    await tokenService.refreshTokens()
    setTimeout(() => refreshTokens(delay), delay)
  }

  useEffect(async () => {
    try {
      const {
        user: userFromToken,
        refreshAccessTokenAfter,
      } = await loginServiсe.loginWithTokens()

      setRefreshAccessTokenAfterMS(refreshAccessTokenAfter)

      return setUser(userFromToken)
    } catch (err) {
      console.log(err.response?.data || err)
      return setUser(null)
    }
  }, [])

  useEffect(async () => {
    if (refreshAccessTokenAfterMS) {
      setTimeout(
        () => refreshTokens(refreshAccessTokenAfterMS),
        refreshAccessTokenAfterMS
      )
    }
  }, [refreshAccessTokenAfterMS])

  return (
    <>
      <LoadingUntillAuthenticated user={user} component={children} />

      <Route path="/login">
        {user === null ? (
          <Login
            setUser={setUser}
            setRefreshAccessTokenAfterMS={setRefreshAccessTokenAfterMS}
          />
        ) : (
          <Redirect to="/" />
        )}
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
          handleChange={handleCustomChange}
        />
        <AuthenticateUser user={user} setUser={setUser}>
          <Confirmator custom={custom} />
        </AuthenticateUser>
      </ErrorBoundary>
    </div>
  )
}

export default App
