import DayjsUtils from '@date-io/dayjs'
import { Checkbox, FormControlLabel, NativeSelect } from '@material-ui/core/'
import AllInboxIcon from '@material-ui/icons/AllInbox'
import { DatePicker, DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers'
import locale_en from 'dayjs/locale/en'
import React from 'react'
import boxesSettings from '../../data/boxes.json'
import CollapseWrapper from '../CollapseWrapper'
import {
  calendarDateToUtc,
  formatHelsinkiCalendarDate,
} from '../../shared/date-fns-tz'
import { calculateAutomaticBoxesPrice } from '../../shared/orderPricing'
import PricingOverrideField from './PricingOverrideField'

const boxesAmountOptions = [0]
for (let i = boxesSettings.minAmount; i <= boxesSettings.maxAmount; i += boxesSettings.step) {
  boxesAmountOptions.push(i)
}

export default function Boxes({ order = {}, handleChange, onOrderChange, style }) {
  const fallbackDate = order?.date ?? new Date()
  const storedBoxes = order?.boxes || {}
  const boxes = {
    ...storedBoxes,
    deliveryDate: storedBoxes.deliveryDate ?? fallbackDate,
    deliveryHasTime: storedBoxes.deliveryHasTime ?? true,
    returnDate: storedBoxes.returnDate ?? fallbackDate,
    returnHasTime: storedBoxes.returnHasTime ?? true,
    amount: storedBoxes.amount ?? 0,
  }
  const includeTimeStart = boxes.deliveryHasTime === true
  const includeTimeEnd = boxes.returnHasTime === true

  const StartPicker = includeTimeStart ? DateTimePicker : DatePicker
  const EndPicker = includeTimeEnd ? DateTimePicker : DatePicker

  const handleDateChange = (name, date, includeTime) => {
    const dateValue = date?.toDate ? date.toDate() : new Date(date)
    const calendarDate = formatHelsinkiCalendarDate(dateValue, `box ${name}`)

    handleChange('boxes', {
      ...boxes,
      [name]: includeTime ? dateValue : calendarDateToUtc(calendarDate, `box ${name}`),
      [name === 'deliveryDate' ? 'deliveryHasTime' : 'returnHasTime']: includeTime,
    })
  }

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
                  format={includeTimeStart ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY'}
                  minutesStep={5}
                  value={boxes.deliveryDate}
                  onChange={(v) => handleDateChange('deliveryDate', v, includeTimeStart)}
                  DialogProps={{ disableScrollLock: true }}
                />
              </MuiPickersUtilsProvider>
              <FormControlLabel
                size="small"
                style={{ display: 'block', marginLeft: 0 }}
                control={
                  <Checkbox
                    checked={includeTimeStart}
                    onChange={() => {
                      handleDateChange('deliveryDate', boxes.deliveryDate, !includeTimeStart)
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
                  format={includeTimeEnd ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY'}
                  minutesStep={5}
                  value={boxes.returnDate}
                  onChange={(v) => handleDateChange('returnDate', v, includeTimeEnd)}
                  DialogProps={{ disableScrollLock: true }}
                />
              </MuiPickersUtilsProvider>
              <FormControlLabel
                size="small"
                style={{ display: 'block', marginLeft: 0 }}
                control={
                  <Checkbox
                    checked={includeTimeEnd}
                    onChange={() => {
                      handleDateChange('returnDate', boxes.returnDate, !includeTimeEnd)
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
              value={boxes.amount}
              onChange={(e) => {
                handleChange('boxes', {
                  ...boxes,
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
            <PricingOverrideField
              order={order}
              component="boxesPrice"
              automaticValue={calculateAutomaticBoxesPrice(order)}
              label="Price"
              name="boxesPrice"
              onChange={onOrderChange}
              className="time-duration"
              style={{ maxWidth: '9rem', marginTop: '0.5rem' }}
            />
          </div>
        </div>
      </CollapseWrapper>
    </>
  )
}
