import React, { useState } from 'react'
import { useHistory, Route } from 'react-router-dom'
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'

export default function InputModal(props) {
  // value === phoneNumber || email
  const { value, label, name, custom, handleChange, disabled } = props
  const [, setModalOpen] = useState(false)

  const slug = label.toLowerCase()
  const history = useHistory()

  const handleModalOpen = () => {
    setModalOpen(true)
    history.push(custom ? `/custom/${slug}` : `/edit/${slug}`)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    history.push(custom ? `/custom/` : '/')
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
        disabled={disabled}
        className="button-info"
        variant="outlined"
        onClick={handleModalOpen}
      >
        {label}
        to:
        {value}
      </Button>
      <Route path={[`/custom/${slug}`, `/edit/${slug}`]}>
        <Modal open onClose={handleModalClose} disableScrollLock>
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
