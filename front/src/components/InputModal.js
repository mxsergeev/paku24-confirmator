import React, { useState } from 'react'
import { useHistory, useRouteMatch, Route } from 'react-router-dom'
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'

export default function InputModal(props) {
  // value === phoneNumber || email
  const { value, label, name, handleChange } = props
  const [, setModalOpen] = useState(false)

  const history = useHistory()

  // this operation gets called two times per render. Fix this!
  const customOrderEditor = useRouteMatch('/custom')?.url

  // console.log('match', customOrderEditor)

  const slug = label.toLowerCase()

  const handleModalOpen = () => {
    setModalOpen(true)
    history.push(
      customOrderEditor ? `${customOrderEditor}/${slug}` : `/edit/${slug}`
    )
  }

  const handleModalClose = () => {
    setModalOpen(false)
    history.push(customOrderEditor ? `${customOrderEditor}` : '/')
  }

  const modalStyle = {
    position: 'absolute',
    maxWidth: 500,
    minWidth: 300,
    padding: 20,
    backgroundColor: 'white',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  }

  return (
    <>
      <Button
        className="button-info"
        variant="outlined"
        onClick={handleModalOpen}
      >
        {label}
        to:
        {value}
      </Button>
      <Route path={[`${customOrderEditor}/${slug}`, `/edit/${slug}`]}>
        <Modal open onClose={handleModalClose}>
          <div style={modalStyle}>
            <TextField
              label={label}
              name={name}
              variant="outlined"
              onChange={handleChange}
              value={value}
              type={label === 'Email' ? label : ''}
              autoFocus
            />
          </div>
        </Modal>
      </Route>
    </>
  )
}
