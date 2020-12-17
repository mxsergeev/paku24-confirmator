import React, { useState, useEffect, useCallback } from 'react'
import Toast from 'light-toast'
import Convert from './components/Convert'
import loginService from './services/login'
import { ErrorBoundary } from 'react-error-boundary'
import loginServiсe from './services/login'
import Header from './components/Header'
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
  const [custom, setCustom] = useState(false)

  const tryToLogin = useCallback(() => {
    loginService
      .checkPass()
      .then((data) => {
        const { isCorrect, message, throttleTime } = data

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

  function handleCustomChange(e) {
    setCustom(e.target.checked)
  }
  
  return (
    <div className="container">
      <Header custom={custom} handleChange={handleCustomChange} logged={logged}/>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {logged ? <Convert custom={custom} /> : null}
      </ErrorBoundary>
    
    </div>
  );
}

export default App;
