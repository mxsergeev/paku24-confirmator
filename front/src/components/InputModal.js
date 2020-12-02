import React, { useState } from 'react' 
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'

export default function InputModal(props) {
  // value === phoneNumber || email
  const { value, label, handleChange } = props

  const modalStyle = {
    position: 'absolute',
    maxWidth: 500,
    minWidth: 300,
    padding: 20,
    backgroundColor: 'white',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  }

  const [modalOpen, setModalOpen] = useState(false)

  const handleModalOpen = () => {
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
  }

  return (
    <>
      <Button className="button-info" variant="outlined" onClick={handleModalOpen}>
        {label} to: {value}
      </Button>
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
      >
      <div style={modalStyle}>
        <TextField 
          label={label} 
          variant="outlined" 
          onChange={handleChange} 
          value={value} 
          autoFocus
        />
      </div>
      </Modal>
    </>
  )
}