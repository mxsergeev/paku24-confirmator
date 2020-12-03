import React, { useState, useEffect, useCallback } from 'react'
import Toast from 'light-toast'
import Convert from './components/Convert'
import loginService from './services/login'
import { ErrorBoundary } from 'react-error-boundary'
import loginServiсe from './services/login'
import Logo from './components/Logo'
import './styles/container.css'

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{color: 'red'}}>{error.message}</pre>
    </div>
  )
}
 
function App() {
  const [logged, setLogged] = useState(false)

  const tryToLogin = useCallback(() => {
    loginService
      .checkPass()
      .then((res) => {
        const { isCorrect, message, throttleTime } = res
        console.log(isCorrect)

        if (message) {
          Toast.fail(`${message} Try again after ${throttleTime / 1000} seconds.`, throttleTime-400)
          setTimeout(() => {
            tryToLogin()
          }, throttleTime)
          return 
        }
        if (!isCorrect) {
          tryToLogin()
        }
  
        setLogged(isCorrect)
      })
      .catch(err => console.log(err))
  }, [])

  useEffect(() => {
    const storedPass = loginServiсe.getStoredPass()
    if (storedPass) {
      return setLogged(true)
    }

    if (!logged) {
      tryToLogin()
    }

  }, [logged, tryToLogin])
  
  return (
    <div className="container">
      <Logo />

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {logged ? <Convert /> : null}
      </ErrorBoundary>
    
    </div>
  );
}

export default App;
