import DayjsUtils from '@date-io/dayjs'
import { Checkbox, FormControlLabel, NativeSelect } from '@material-ui/core/'
import AllInboxIcon from '@material-ui/icons/AllInbox'
import { DatePicker, DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import dayjs from 'dayjs'
import locale_en from 'dayjs/locale/en'
import React, { useEffect, useState } from 'react'
import boxesSettings from '../../data/boxes.json'
import CollapseWrapper from '../CollapseWrapper'

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
    setIncludeTime_start(order.boxesDeliveryDate.includes('T'))
    setIncludeTime_end(order.boxesPickupDate.includes('T'))
  }, [order.boxesDeliveryDate, order.boxesPickupDate])

  const [selfPickup, setSelfPickup] = useState(false)
  const [selfReturn, setSelfReturn] = useState(false)

  useEffect(() => {
    setSelfPickup(order.selfPickup)
    setSelfReturn(order.selfReturn)
  }, [order.selfPickup, order.selfReturn])

  const handleDateChange = (name, date, includeTime) =>
    handleChange({
      target: {
        name,
        value: includeTime
          ? new Date(date).toISOString()
          : // Not using .toISOString() as it will change the date to a previos day in the Helsinki/Finland timezone
            // dayjs().format() keeps the timezone info and displays the correct day
            dayjs(date).format().split('T')[0],
      },
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
                  minutesStep={15}
                  value={order.boxesDeliveryDate}
                  onChange={(v) =>
                    handleDateChange('boxesDeliveryDate', new Date(v), includeTime_start)
                  }
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
                      handleDateChange('boxesDeliveryDate', order.boxesDeliveryDate, v)
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
                  minutesStep={15}
                  value={order.boxesPickupDate}
                  onChange={(v) =>
                    handleDateChange('boxesPickupDate', new Date(v), includeTime_end)
                  }
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
                      handleDateChange('boxesPickupDate', order.boxesPickupDate, v)
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
              name="boxesAmount"
              value={order?.boxesAmount}
              onChange={handleChange}
              variant="filled"
            >
              {boxesAmountOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </NativeSelect>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <FormControlLabel
                size="small"
                style={{ display: 'block', marginLeft: 0 }}
                control={
                  <Checkbox
                    checked={selfPickup}
                    onChange={() => {
                      const v = !selfPickup
                      setSelfPickup(v)
                      handleChange({
                        target: {
                          name: 'selfPickup',
                          value: v,
                        },
                      })
                    }}
                    color="primary"
                  />
                }
                label="Self pickup"
                labelPlacement="start"
              />
              <FormControlLabel
                size="small"
                style={{ display: 'block', marginLeft: 0 }}
                control={
                  <Checkbox
                    checked={selfReturn}
                    onChange={() => {
                      const v = !selfReturn
                      setSelfReturn(v)
                      handleChange({
                        target: {
                          name: 'selfReturn',
                          value: v,
                        },
                      })
                    }}
                    color="primary"
                  />
                }
                label="Self return"
                labelPlacement="start"
              />
            </div>
          </div>
        </div>
      </CollapseWrapper>
    </>
  )
}
