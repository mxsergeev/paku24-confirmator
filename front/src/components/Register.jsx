import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import axios from 'axios'
import Notification from './Notification'

export default function Register() {
  const background = {
    width: '95%',
    padding: 20,
    margin: '0 auto',
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

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [purpose, setPurpose] = useState('')
  const [response, setResponse] = useState('')
  const [disabled, setDisabled] = useState(false)

  async function sendRequestForAccess(params) {
    return axios
      .post('/api/registration/request-access', params)
      .then((res) => res.data)
  }

  async function handleRequest(event) {
    event.preventDefault()
    setDisabled(true)
    setResponse('Working...')
    try {
      const res = await sendRequestForAccess({ name, email, purpose })
      setResponse(res?.message)
      setName('')
      setEmail('')
      setPurpose('')
      setDisabled(false)
    } catch (err) {
      setDisabled(false)
      setResponse(`Error: ${err?.response.data?.error}`)
    }
  }

  return (
    <div style={{ margin: '30px 5px' }}>
      <div style={background}>
        <div style={formContainer}>
          REQUEST ACCESS
          <span
            style={{
              color: 'black',
              fontSize: '1.0rem',
              letterSpacing: '0.2px',
            }}
          >
            {' '}
            or <Link to="/login">login</Link>
          </span>
        </div>

        <Notification notification={response} />

        <form onSubmit={handleRequest} style={flexForm}>
          <TextField
            style={flexItem}
            required
            name="name"
            value={name}
            onChange={({ target }) => setName(target.value)}
            label="Name"
            variant="filled"
            size="small"
          />
          <TextField
            style={flexItem}
            type="email"
            required
            value={email}
            name="email"
            onChange={({ target }) => setEmail(target.value)}
            label="Email"
            variant="filled"
            size="small"
          />

          <TextField
            style={flexItem}
            type="text"
            required
            multiline
            rows="3"
            value={purpose}
            name="purpose"
            onChange={({ target }) => setPurpose(target.value)}
            label="Why you want to use this application?"
            variant="filled"
            size="small"
          />

          <Button
            style={flexItem}
            type="submit"
            disabled={disabled}
            variant="contained"
            size="small"
          >
            Send request
          </Button>
        </form>
      </div>
    </div>
  )
}
