import DayjsUtils from '@date-io/dayjs'
import { Checkbox, FormControlLabel, NativeSelect } from '@material-ui/core/'
import AllInboxIcon from '@material-ui/icons/AllInbox'
import { DatePicker, DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import locale_en from 'dayjs/locale/en'
import React, { useEffect, useState } from 'react'
import boxesSettings from '../../data/boxes.json'
import CollapseWrapper from '../CollapseWrapper'
import dayjs from '../../shared/dayjs'
import { isDateOnly } from '../../shared/date-fns-tz'

const boxesAmountOptions = [0]
for (let i = boxesSettings.minAmount; i <= boxesSettings.maxAmount; i += boxesSettings.step) {
  boxesAmountOptions.push(i)
}

export default function Boxes({ order = {}, handleChange, style }) {
  const [includeTime_start, setIncludeTime_start] = useState(true)
  const [includeTime_end, setIncludeTime_end] = useState(true)

  const StartPicker = includeTime_start ? DateTimePicker : DatePicker
  const EndPicker = includeTime_end ? DateTimePicker : DatePicker

  useEffect(() => {
    setIncludeTime_start(!isDateOnly(order.boxes.deliveryDate))
    setIncludeTime_end(!isDateOnly(order.boxes.returnDate))
  }, [order.boxes.deliveryDate, order.boxes.returnDate])

  const handleDateChange = (name, date, includeTime) =>
    handleChange('boxes', {
      ...order.boxes,
      // Not using .toISOString() as it will change the date to a previos day in the Helsinki/Finland timezone
      // dayjs().format() keeps the timezone info and displays the correct day
      [name]: includeTime ? dayjs(date).format() : dayjs(date).format('YYYY-MM-DD'),
    })

  return (
    <>
      <CollapseWrapper
        style={{ width: '100%', gap: '0.25rem' }}
        containerStyle={{
          width: '100%',
          border: '1px solid lightgray',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          ...style,
        }}
        label={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <AllInboxIcon /> Boxes
          </div>
        }
      >
        <div
          style={{
            margin: '1.25rem 0.5rem 0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div>
              <MuiPickersUtilsProvider utils={DayjsUtils} locale={locale_en}>
                <StartPicker
                  ampm={false}
                  format={includeTime_start ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY'}
                  minutesStep={5}
                  value={order.boxes.deliveryDate}
                  onChange={(v) => handleDateChange('deliveryDate', v, includeTime_start)}
                  DialogProps={{ disableScrollLock: true }}
                />
              </MuiPickersUtilsProvider>
              <FormControlLabel
                size="small"
                style={{ display: 'block', marginLeft: 0 }}
                control={
                  <Checkbox
                    checked={includeTime_start}
                    onChange={() => {
                      const v = !includeTime_start
                      setIncludeTime_start(v)
                      handleDateChange('deliveryDate', order.boxes.deliveryDate, v)
                    }}
                    color="primary"
                  />
                }
                label="Include time"
                labelPlacement="start"
              />
            </div>
            <div style={{ fontSize: '1.25rem' }}>–</div>
            <div>
              <MuiPickersUtilsProvider utils={DayjsUtils} locale={locale_en}>
                <EndPicker
                  ampm={false}
                  format={includeTime_end ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY'}
                  minutesStep={5}
                  value={order.boxes.returnDate}
                  onChange={(v) => handleDateChange('returnDate', v, includeTime_end)}
                  DialogProps={{ disableScrollLock: true }}
                />
              </MuiPickersUtilsProvider>
              <FormControlLabel
                size="small"
                style={{ display: 'block', marginLeft: 0 }}
                control={
                  <Checkbox
                    checked={includeTime_end}
                    onChange={() => {
                      const v = !includeTime_end
                      setIncludeTime_end(v)
                      handleDateChange('returnDate', order.boxes.returnDate, v)
                    }}
                    color="primary"
                  />
                }
                label="Include time"
                labelPlacement="start"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <NativeSelect
              className="time-duration"
              style={{ maxWidth: '9rem', marginTop: '0.5rem' }}
              name="amount"
              label="Amount"
              value={order.boxes.amount}
              onChange={(e) => {
                handleChange('boxes', {
                  ...order.boxes,
                  amount: Number(e.target.value),
                })
              }}
              variant="filled"
            >
              {boxesAmountOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </NativeSelect>

          </div>
        </div>
      </CollapseWrapper>
    </>
  )
}
