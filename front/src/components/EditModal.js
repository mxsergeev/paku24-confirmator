import React, { useState, useEffect } from 'react' 
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import NativeSelect from '@material-ui/core/NativeSelect'
import TransformButton from './buttons/TransformButton'
import * as regexHelpers from '../utils/helpers/regexHelpers'
import * as calculations from '../utils/helpers/calculations'
import services from '../utils/services.json'

export default function EditModal(props) {
  const { order, handleEditorFormatting } = props

  const [modalOpen, setModalOpen] = useState(false)
  const [editedOrder, setEditedOrder] = useState(order)

  useEffect(() => {
    setEditedOrder(order)
  }, [order])

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

  function handleOrderChange(e) {
    if (e.target.name === 'ISODate') {
      const ISODate = e.target.value
      return setEditedOrder(
        { ...editedOrder, 
          date: {
            [e.target.name]: ISODate,
            original: new Date(ISODate),
            confirmationFormat: regexHelpers.toConfirmationDateFormat(ISODate)
          }
        }
      )
    }
    if (e.target.name === 'serviceName') {
      const serviceName = e.target.value
      console.log('price', services.find(service => service.name === serviceName).price)
      return setEditedOrder(
        { ...editedOrder,
          [e.target.name]: serviceName,
          servicePrice: services.find(service => service.name === serviceName).price
        }
      )
    }
    setEditedOrder({...editedOrder, [e.target.name]: e.target.value })
  }

  function calcAndPrintFees() {
    return regexHelpers.printFees(
      calculations.calculateFees(
        editedOrder.date.original, 
        editedOrder.time, 
        editedOrder.paymentType
      )
    )
  }

  function handleFormatting() {
    const fees = calcAndPrintFees()
    handleEditorFormatting({ ...editedOrder, fees })
    handleModalClose()
  }

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
            name="ISODate"
            value={editedOrder?.date?.ISODate}
            onChange={handleOrderChange}
            type="date"
          />
          <TextField 
            name="time"
            value={editedOrder?.time}          
            onChange={handleOrderChange}
            inputProps={{ step: "900" }}
            type="time"
          />

          <NativeSelect
            name="duration"
            value={editedOrder?.duration}
            onChange={handleOrderChange}
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
            name="serviceName"
            value={editedOrder?.serviceName}
            onChange={handleOrderChange}
          >
            {services.map((service, index) => {
              return <option key={index} value={service.name}>{service.name}</option>
            })}
          </NativeSelect>

          <NativeSelect
            name="paymentType"
            value={editedOrder?.paymentType}
            onChange={handleOrderChange}
          >
            <option value="Maksukortti">Maksukortti</option>
            <option value="Käteinen">Käteinen</option>
            <option value="Lasku">Lasku</option>
          </NativeSelect>

          <TextField
            required={true}
            name="address"
            value={editedOrder?.address}
            onChange={handleOrderChange}
            label='address' 
            variant="outlined" 
          />
          
          <TextField 
            name="destination"
            value={editedOrder?.destination}
            onChange={handleOrderChange}
            label='Destination' 
            variant="outlined" 
          />

          <TextField 
            name="name"
            value={editedOrder?.name}
            onChange={handleOrderChange}
            label='Name' 
            variant="outlined" 
          />

          <TextField 
            name="email"
            value={editedOrder?.email}
            onChange={handleOrderChange}
            type={"email"}
            label='Email' 
            variant="outlined" 
          />

          <TextField
            required={true} 
            name="phone"
            value={editedOrder?.phone}
            onChange={handleOrderChange}
            label='Phonenumber' 
            variant="outlined" 
          />

          <TransformButton 
            handleClick={handleFormatting}
          />

        </div>
      </Modal>
    </>
  )
}