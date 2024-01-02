import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import CancelIcon from '@material-ui/icons/Cancel'
import App from './App'
import './index.css'

const notistackRef = React.createRef()

ReactDOM.render(
  <React.StrictMode>
    <Router basename="/app">
      <SnackbarProvider
        action={(key) => (
          <CancelIcon
            onClick={() => {
              notistackRef.current.closeSnackbar(key)
            }}
          />
        )}
        ref={notistackRef}
        maxSnack={3}
        dense
        autoHideDuration={5000}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
      />

      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById('root')
)
