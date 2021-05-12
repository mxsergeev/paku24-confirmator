import React from 'react'
import TextField from '@material-ui/core/TextField'
import NativeSelect from '@material-ui/core/NativeSelect'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import services from '../utils/services.json'
import TransformButton from './buttons/TransformButton'

export default function Editor({ order, handleChange, handleClick }) {
  const margin = {
    marginTop: 5,
  }
  const marginLeftRight = {
    marginLeft: 5,
    marginRight: 5,
  }

  return (
    <div className="basic-flex" style={{ marginTop: '15px' }}>
      <TextField
        fullWidth
        style={marginLeftRight}
        className="flex-item"
        name="ISODate"
        value={order?.date?.ISODate}
        onChange={handleChange}
        type="date"
      />
      <div className="flex-100-space-between flex-item" style={marginLeftRight}>
        <TextField
          className="time-duration"
          style={{ ...marginLeftRight, paddingRight: 10 }}
          name="time"
          value={order?.time}
          onChange={handleChange}
          inputProps={{ step: '900' }}
          type="time"
        />

        <NativeSelect
          className="time-duration"
          style={{ ...marginLeftRight, paddingLeft: 10 }}
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
      </div>

      <NativeSelect
        fullWidth
        style={marginLeftRight}
        className="flex-item"
        name="serviceName"
        value={order?.serviceName}
        onChange={handleChange}
      >
        {services.map((service) => (
          <option key={service.id} value={service.name}>
            {service.name}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        fullWidth
        style={marginLeftRight}
        className="flex-item"
        name="paymentType"
        value={order?.paymentType}
        onChange={handleChange}
      >
        <option value="Maksukortti">Maksukortti</option>
        <option value="Käteinen">Käteinen</option>
        <option value="Lasku/Osamaksu">Lasku</option>
      </NativeSelect>

      <TextField
        fullWidth
        style={margin}
        className="flex-item"
        required
        name="address"
        value={order?.address}
        onChange={handleChange}
        label="Address"
        variant="outlined"
        size="small"
      />

      <TextField
        fullWidth
        multiline
        style={margin}
        className="flex-item"
        name="destination"
        value={order?.destination}
        onChange={handleChange}
        label="Destination"
        variant="outlined"
        size="small"
      />

      <TextField
        fullWidth
        required
        style={margin}
        className="flex-item"
        name="name"
        value={order?.name}
        onChange={handleChange}
        label="Name"
        variant="outlined"
        size="small"
      />

      <TextField
        fullWidth
        style={margin}
        className="flex-item"
        name="email"
        value={order?.email}
        onChange={handleChange}
        type="email"
        label="Email"
        variant="outlined"
        size="small"
      />

      <TextField
        fullWidth
        style={margin}
        className="flex-item"
        required
        name="phone"
        value={order?.phone}
        onChange={handleChange}
        label="Phonenumber"
        variant="outlined"
        size="small"
      />

      <TextareaAutosize
        style={margin}
        className="flex-item textarea-2"
        rowsMin={3}
        cols={27}
        name="comment"
        value={order?.comment}
        placeholder="Additional information."
        onChange={handleChange}
      />

      <TransformButton className="flex-item" handleClick={handleClick} />
    </div>
  )
}
