import React from 'react'
import { useHistory, Route } from 'react-router-dom'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import { useTheme } from '@material-ui/core/styles'
import Editor from './Editor'

export default function ResponsiveDialog(props) {
  const { order, handleFormatting, handleChange } = props

  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const history = useHistory()

  const handleClickOpen = () => {
    history.push('/edit')
  }

  const handleClose = () => {
    history.push('/')
  }

  return (
    <>
      <Button
        className="button-one-third"
        variant="outlined"
        onClick={handleClickOpen}
      >
        Edit
      </Button>
      <Route exact path="/edit">
        <Dialog
          fullScreen={fullScreen}
          open
          onClose={handleClose}
          aria-labelledby="responsive-dialog-title"
          disableScrollLock
        >
          <DialogContent>
            <Editor
              order={order}
              handleChange={handleChange}
              handleClick={() => {
                handleFormatting()
                handleClose()
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              style={{ backgroundColor: 'white' }}
              variant="text"
              onClick={handleClose}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Route>
    </>
  )
}
