import React from 'react'
import TextField from '@material-ui/core/TextField'
import NativeSelect from '@material-ui/core/NativeSelect'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import DayjsUtils from '@date-io/dayjs'
import locale_en from 'dayjs/locale/en'
import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import services from '../../data/services.json'
import paymentTypes from '../../data/paymentTypes.json'
import Boxes from './Boxes'

export default function Editor({ order, handleChange }) {
  const margin = {
    marginTop: 5,
  }
  const marginLeftRight = {
    marginLeft: 5,
    marginRight: 5,
  }

  locale_en.weekStart = 1

  function handleDateChange(name, value) {
    return handleChange({ target: { name, value } })
  }

  return (
    <div className="basic-flex" style={{ marginTop: '5px' }}>
      <div className="flex-100-space-between flex-item" style={marginLeftRight}>
        <MuiPickersUtilsProvider utils={DayjsUtils} locale={locale_en}>
          <DateTimePicker
            ampm={false}
            format="DD-MM-YYYY HH:mm"
            minutesStep={15}
            style={marginLeftRight}
            className="time-duration"
            value={order.dateTime}
            onChange={(v) => handleDateChange('dateTime', new Date(v))}
            DialogProps={{ disableScrollLock: true }}
          />
        </MuiPickersUtilsProvider>

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
        {paymentTypes.map(({ name, id }) => (
          <option key={id} value={name}>
            {name}
          </option>
        ))}
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

      <Boxes style={{ marginTop: margin.marginTop }} order={order} handleChange={handleChange} />

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
    </div>
  )
}
