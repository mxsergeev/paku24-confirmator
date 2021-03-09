import React, { useState } from 'react'
import { useHistory, Link } from 'react-router-dom'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import loginServiсe from '../services/login'
import Notification from './Notification'

export default function Login({ setUser }) {
  const background = {
    width: '95%',
    padding: 20,
    backgroundColor: 'lightgrey',
    borderBottom: '4px solid darkgrey',
  }

  const flexItem = {
    marginBottom: '7px',
    backgroundColor: 'white',
  }

  const formContainer = {
    color: 'black',
    fontSize: '1.3rem',
    letterSpacing: '0.7px',
    marginTop: '10px',
    marginBottom: '15px',
  }

  const flexForm = {
    paddingBottom: '10px',
    height: '80%',
    display: 'flex',
    flexFlow: 'column wrap',
    justifyContent: 'space-evenly',
  }

  const history = useHistory()
  const referrer = history?.location.state?.referrer
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isButtonDisabled, setIsButtonDisabled] = useState(false)
  const [inputError, setInputError] = useState(false)
  const [notification, setNotification] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setNotification('Working...')

    try {
      const { user } = await loginServiсe.loginWithCredentials({
        username,
        password,
      })
      setNotification('Done')

      history.push(referrer || '/')
      setUser(user)
    } catch (err) {
      setInputError(true)
      setIsButtonDisabled(true)
      setTimeout(() => setIsButtonDisabled(false), 2000)
      setNotification(`Error: ${err.response?.data.error}`)
    }
  }

  return (
    <div style={{ margin: '30px 5px' }}>
      <div style={{ ...background, margin: '20px 5px' }}>
        <div style={formContainer}>
          LOGIN
          <span
            style={{
              color: 'black',
              fontSize: '1.0rem',
              letterSpacing: '0.2px',
            }}
          >
            {' '}
            or <Link to="/register">request access</Link>
          </span>
        </div>

        <Notification notification={notification} />

        <form onSubmit={handleLogin} style={flexForm}>
          <TextField
            className="flex-item"
            style={flexItem}
            error={inputError}
            required
            name="username"
            value={username}
            onChange={({ target }) => setUsername(target.value)}
            label="Username"
            variant="filled"
            size="small"
          />
          <TextField
            className="flex-item"
            style={flexItem}
            error={inputError}
            type="password"
            required
            value={password}
            name="password"
            onChange={({ target }) => setPassword(target.value)}
            label="Password"
            variant="filled"
            size="small"
          />

          <Button
            className="flex-item"
            style={flexItem}
            type="submit"
            disabled={isButtonDisabled}
            variant="contained"
            size="small"
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  )
}
