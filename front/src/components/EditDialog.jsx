import React from 'react'
import { useHistory, Route } from 'react-router-dom'
import Button from '@material-ui/core/Button'
import Editor from './Editor'
import ResponsiveDialog from './ResponsiveDialog'

export default function EditDialog(props) {
  const { order, handleFormatting, handleChange } = props

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
        <ResponsiveDialog
          component={
            <Editor
              order={order}
              handleChange={handleChange}
              handleClick={() => {
                handleFormatting()
                handleClose()
              }}
            />
          }
          handleClose={handleClose}
        />
      </Route>
    </>
  )
}
