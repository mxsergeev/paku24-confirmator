import React, { useState } from 'react' 
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import Editor from './Editor'

export default function EditModal(props) {
  const { order, handleFormatting, handleChange } = props

  const [modalOpen, setModalOpen] = useState(false)

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


  const handleModalOpen = () => {
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
  }

  return (
    <>
      <Button className="button-one-third" variant="outlined" onClick={handleModalOpen}>
        Edit
      </Button>

      <Modal
        open={modalOpen}
        onClose={handleModalClose}
      >
        <div style={modalStyle}>

          <Editor 
            order={order} 
            handleChange={handleChange} 
            handleClick={() => {
              handleFormatting()
              handleModalClose()
            }}
          />

        </div>
      </Modal>
    </>
  )
}