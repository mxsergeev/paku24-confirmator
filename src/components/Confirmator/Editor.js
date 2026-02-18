import React, { useEffect, useState } from 'react'
import { Button } from '@material-ui/core'
import TextField from '@material-ui/core/TextField'
import NativeSelect from '@material-ui/core/NativeSelect'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import PlaylistAddRoundedIcon from '@material-ui/icons/PlaylistAddRounded'
import DayjsUtils from '@date-io/dayjs'
import locale_en from 'dayjs/locale/en'
import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import services from '../../data/services.json'
import paymentTypes from '../../data/paymentTypes.json'
import Boxes from './Boxes'
import Address from './Address'
import FeeSelector from './Editor/FeeSelector'
import {
  parseAndFormatDecimalString,
  sanitizeDecimalString,
} from '../../helpers/decimalStringHelpers'

export default function Editor({ order, handleChange }) {
  const margin = {
    marginTop: 5,
  }
  const marginLeftRight = {
    marginLeft: 5,
    marginRight: 5,
  }

  locale_en.weekStart = 1

  const [manualPriceInput, setManualPriceInput] = useState(order?.manualPrice ?? order?.price ?? '')

  useEffect(() => {
    if (order.manualPrice != null && order.manualPrice !== order.autoPrice) {
      setManualPriceInput(String(order.manualPrice))
    } else if (order.price != null) {
      setManualPriceInput(String(order.price))
    } else {
      setManualPriceInput('')
    }
  }, [order.manualPrice, order.autoPrice, order.price])

  return (
    <div className="basic-flex" style={{ marginTop: '5px' }}>
      <div className="flex-100-space-between flex-item" style={marginLeftRight}>
        <MuiPickersUtilsProvider utils={DayjsUtils} locale={locale_en}>
          <DateTimePicker
            ampm={false}
            format="DD-MM-YYYY HH:mm"
            minutesStep={5}
            style={marginLeftRight}
            className="time-duration"
            value={order.date}
            onChange={(v) => handleChange('date', new Date(v))}
            DialogProps={{ disableScrollLock: true }}
          />
        </MuiPickersUtilsProvider>

        <NativeSelect
          className="time-duration"
          style={{ ...marginLeftRight, paddingLeft: 10 }}
          name="duration"
          value={order?.duration}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
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
        name="service"
        value={order.service.id}
        onChange={(e) =>
          handleChange(
            'service',
            services.find((s) => s.id === e.target.value)
          )
        }
      >
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        fullWidth
        style={marginLeftRight}
        className="flex-item"
        name="paymentType"
        value={order?.paymentType.id}
        onChange={(e) =>
          handleChange(
            'paymentType',
            paymentTypes.find((p) => p.id === e.target.value)
          )
        }
      >
        {paymentTypes.map(({ name, id }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <Address
        value={order?.address}
        onChange={(address) => handleChange('address', address)}
        style={{
          marginTop: '0.25rem',
          marginBottom: order?.extraAddresses?.length > 0 ? '1rem' : 0,
        }}
      />
      {order?.extraAddresses.map((a) => (
        <Address
          key={a.id}
          value={a}
          showRemove
          onChange={(address) =>
            handleChange(
              'extraAddresses',
              address.removeId
                ? order.extraAddresses.filter((addr) => addr.id !== address.removeId)
                : order.extraAddresses.map((addr) => (addr.id === address.id ? address : addr))
            )
          }
        />
      ))}

      <Button
        size="small"
        style={{ color: 'gray' }}
        onClick={() =>
          handleChange('extraAddresses', [
            ...order.extraAddresses,
            {
              id: Date.now().toString(),
              street: '',
              city: '',
              index: '',
              floor: 0,
              elevator: false,
            },
          ])
        }
      >
        <PlaylistAddRoundedIcon />
      </Button>

      <Address
        value={order?.destination}
        onChange={(address) => handleChange('destination', address)}
      />
      <TextField
        fullWidth
        required
        style={margin}
        className="flex-item"
        name="name"
        value={order?.name}
        onChange={(e) => handleChange(e.target.name, e.target.value)}
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
        onChange={(e) => handleChange(e.target.name, e.target.value)}
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
        onChange={(e) => handleChange(e.target.name, e.target.value)}
        label="Phonenumber"
        variant="outlined"
        size="small"
      />
      <Boxes style={{ marginTop: margin.marginTop }} order={order} handleChange={handleChange} />
      <TextField
        fullWidth
        style={margin}
        className="flex-item"
        name="price"
        value={manualPriceInput}
        onChange={(e) => setManualPriceInput(sanitizeDecimalString(e.target.value))}
        onBlur={() => {
          const { formatted, numeric } = parseAndFormatDecimalString(manualPriceInput)
          setManualPriceInput(formatted)
          handleChange('manualPrice', numeric)
        }}
        label="Price estimate"
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
        onChange={(e) => handleChange(e.target.name, e.target.value)}
      />
      <FeeSelector
        order={order}
        onChange={(fees) => handleChange('manualFees', fees)}
        path="/confirmator/fees"
      />
    </div>
  )
}
