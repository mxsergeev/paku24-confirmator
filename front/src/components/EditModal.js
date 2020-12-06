import React, { useState } from 'react' 
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import NativeSelect from '@material-ui/core/NativeSelect'

export default function EditModal(props) {
  // value === phoneNumber || email
  const { order, handleChange } = props

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

  const defaultTime = `${new Date().toTimeString().split(':')[0]}:${new Date().toTimeString().split(':')[1]}`

  return (
    <>
      <Button className="button-info" variant="outlined" onClick={handleModalOpen}>
        Edit
      </Button>
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
      >
        <div style={modalStyle}>
          <TextField 
            name="dateISO"
            value={order?.dateISO || new Date().toISOString().split('T')[0]}
            onChange={handleChange}
            type="date"
          />
          <TextField 
            name="time"
            value={order?.time || defaultTime}          
            onChange={handleChange}
            inputProps={{ step: '15000' }}
            type="time"
          />

          <NativeSelect
            name="duration"
            value={order?.duration}
            onChange={handleChange}
          >
            <option value={1}>1h</option>
            <option value={1.5}>1.5h</option>
            <option value={2}>2h</option>
            <option value={2.5}>2.5h</option>
            <option value={3}>3h</option>
            <option value={3.5}>3.5h</option>
            <option value={4}>4h</option>
            <option value={4.5}>4.5h</option>
            <option value={5}>5h</option>
            <option value={5.5}>5.5h</option>
            <option value={6}>6h</option>
            <option value={6.5}>6.5h</option>
            <option value={7}>7h</option>
            <option value={7.5}>7.5h</option>
            <option value={8}>8h</option>
            <option value={8.5}>8.5h</option>
            <option value={9}>9h</option>
            <option value={9.5}>9.5h</option>
            <option value={10}>10h</option>
          </NativeSelect>

          <NativeSelect
            name="paymentType"
            value={order?.paymentType}
            onChange={handleChange}
          >
            <option value="Maksukortti">Maksukortti</option>
            <option value="Käteinen">Käteinen</option>
            <option value="Lasku">Lasku</option>
          </NativeSelect>

          <TextField 
            name="name"
            value={order?.name}
            onChange={handleChange}
            label='Name' 
            variant="outlined" 
          />

        </div>
      </Modal>
    </>
  )
}