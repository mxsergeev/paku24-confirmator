import 'temporal-polyfill/global'
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { SnackbarProvider } from 'notistack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CancelIcon from '@material-ui/icons/Cancel'
import App from './App'
import './index.css'

const notistackRef = React.createRef()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
})

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
