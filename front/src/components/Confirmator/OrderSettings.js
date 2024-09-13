import React from 'react'
import FormLabel from '@material-ui/core/FormLabel'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Radio from '@material-ui/core/Radio'
import RadioGroup from '@material-ui/core/RadioGroup'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import colors from '../../data/colors.json'

export default function CheckboxGroup(props) {
  const { handleChange, order } = props

  return (
    <div className="checkbox-container">
      <FormControl className="checkbox-distance flex-item" hiddenLabel={false} size="small">
        <FormLabel component="legend">Pick one:</FormLabel>
        <RadioGroup value={order.distance} onChange={handleChange}>
          <FormControlLabel
            name="distance"
            value="insideCapital"
            control={<Radio color="default" />}
            label="🏙 Inside capital"
          />
          <FormControlLabel
            name="distance"
            value="outsideCapital"
            control={<Radio color="default" />}
            label="🏞 Outside capital"
          />
          <FormControlLabel
            name="distance"
            value="fromCapitalToOutside"
            control={<Radio color="default" />}
            label="🏙->🏞 From capital"
          />
          <FormControlLabel
            name="distance"
            value="fromOutsideToCapital"
            control={<Radio color="default" />}
            label="🏞->🏙 To capital"
          />
        </RadioGroup>
      </FormControl>
      <FormControl className="basic-flex" size="small" style={{ alignItems: 'flex-end' }}>
        <div className="color-selector">
          <div>Event color</div>

          <Select
            variant="filled"
            name="eventColor"
            value={order?.eventColor}
            onChange={handleChange}
            label="Event color"
            renderValue={(value) => (
              <>
                <span style={{ backgroundColor: colors[value].hex }} className="color-option">
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
              </>
            )}
          >
            {Object.entries(colors).map(([colorId, colorData]) => (
              <MenuItem key={colorId} value={colorId}>
                <span
                  style={{ backgroundColor: colorData.hex, marginRight: '0.5rem' }}
                  className="color-option"
                />
                {colorData.name}
              </MenuItem>
            ))}
          </Select>
        </div>

        <FormControlLabel
          size="small"
          className="flex-item"
          control={<Checkbox checked={order.hsy} onChange={handleChange} color="primary" />}
          name="hsy"
          label="♻ HSY"
          labelPlacement="start"
        />

        <FormControlLabel
          style={{ display: 'none' }}
          className="flex-item"
          control={<Checkbox checked={order.XL} onChange={handleChange} color="primary" />}
          name="XL"
          label="XL"
          labelPlacement="start"
        />
      </FormControl>
    </div>
  )
}
