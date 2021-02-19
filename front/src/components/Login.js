import React, { useState } from 'react'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'

export default function Login() {
  const [, setPassword] = useState('')
  const [isButtonDisabled] = useState(false)
  const [inputError] = useState(false)

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

  return (
    <div style={flexStyle}>
      <div style={background}>
        <h3>Login!</h3>
        <form>
          <TextField
            error={inputError}
            helperText={inputError ? 'Incorrect password.' : null}
            type="password"
            required
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
            variant="outlined"
            size="small"
          />

          <Button
            type="type"
            disabled={isButtonDisabled}
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.preventDefault()
            }}
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  )
}
