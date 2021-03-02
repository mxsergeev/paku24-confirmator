import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import loginServiсe from '../services/login'

export default function Login({ setUser }) {
  const flexStyle = {
    display: 'flex',
    flexFlow: 'row wrap',
    justifyContent: 'center',
  }

  const background = {
    width: '70%',
    padding: 30,
    backgroundColor: 'lightgrey',
  }

  const history = useHistory()
  const referrer = history?.location.state.referrer
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isButtonDisabled, setIsButtonDisabled] = useState(false)
  const [inputError, setInputError] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()

    try {
      const { user } = await loginServiсe.loginWithCredentials({
        username,
        password,
      })

      history.push(referrer || '/')
      setUser(user)
    } catch (err) {
      setInputError(true)
      setIsButtonDisabled(true)
      setTimeout(() => setIsButtonDisabled(false), 2000)
      console.log(err.response?.data || err)
    }
  }

  return (
    <div style={flexStyle}>
      <div style={background}>
        <h3>Login!</h3>
        <form onSubmit={handleLogin}>
          <TextField
            error={inputError}
            required
            name="username"
            value={username}
            onChange={({ target }) => setUsername(target.value)}
            label="Username"
            variant="outlined"
            size="small"
          />
          <TextField
            error={inputError}
            type="password"
            required
            value={password}
            name="password"
            onChange={({ target }) => setPassword(target.value)}
            label="Password"
            variant="outlined"
            size="small"
          />

          <Button
            type="submit"
            disabled={isButtonDisabled}
            variant="outlined"
            size="small"
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  )
}
