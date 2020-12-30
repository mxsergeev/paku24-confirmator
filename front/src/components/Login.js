import React, { useCallback, useEffect, useState } from 'react'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import loginServiсe from '../services/login'
import Toast from 'light-toast'
import FormGroup from '@material-ui/core/FormGroup';
import { Route, Redirect, useHistory } from "react-router-dom"

// function usePasswordFromLocalStorage() {
//   useEffect(() => {
//     const storedPass = loginServiсe.getStoredPass()
//     if (storedPass) {
//       <Redirect to='/' />
//       return handleIsLoggedChange(true)
//     }
//   }, [])
// }

export default function Login({ handleIsLoggedChange, isLogged }) {
  const [password, setPassword] = useState('')
  const [isButtonDisabled, setIsButtonDisabled] = useState(false)
  const [inputError, setInputError] = useState(false)

  const history = useHistory()

  const tryToLogin = useCallback((pass) => {

    loginServiсe
      .checkPass(pass)
      .then((data) => {
        const { isCorrect, message, throttleTime } = data

        if (message) {
          Toast.fail(`${message} Try again after ${throttleTime / 1000} seconds.`, throttleTime-400)
          setIsButtonDisabled(true)
          setTimeout(() => {
            setIsButtonDisabled(false)
          }, throttleTime) 
        }
        if (!isCorrect) {
          return setInputError(true)
        }
  
        handleIsLoggedChange(isCorrect)
        history.replace('/')
      })
      .catch(err => console.log(err))
  }, [handleIsLoggedChange, history])

  const flexStyle = {
    display: 'flex',
    flexFlow: 'row wrap',
    justifyContent: 'center',
  }

  const background = {
    width: '70%',
    padding: 30,
    backgroundColor: 'lightgrey'
  }

  return (
    <div style={flexStyle}>
      <div style={background}>

      <h3>Login!</h3>
      <form>
        <TextField
          error={inputError}
          helperText={inputError ? "Incorrect password." : null}
          type="password"
          required={true}
          name="password"
          onChange={(e) => setPassword(e.target.value)}
          label='Password' 
          variant="outlined" 
          size="small"
        />

        <Button
          type='type'
          disabled={isButtonDisabled}
          variant="outlined"
          size="small" 
          onClick={(e) => {
            e.preventDefault()
            tryToLogin(password)
          }}
        >
          Login
        </Button>
      </form>
      </div>
    </div>
  )
}