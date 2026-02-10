import React from 'react'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import { useTheme } from '@material-ui/core/styles'
import { Route, useHistory } from 'react-router-dom'

export default function ResponsiveDialog({ children, handleClose = null, path }) {
  const history = useHistory()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const close = handleClose ?? (() => history.goBack())

  return (
    <>
      <Route path={path}>
        <Dialog
          fullScreen={fullScreen}
          open
          onClose={close}
          aria-labelledby="responsive-dialog-title"
        >
          <DialogContent>{children}</DialogContent>
          <DialogActions>
            <Button style={{ backgroundColor: 'white' }} variant="text" onClick={close}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Route>
    </>
  )
}
