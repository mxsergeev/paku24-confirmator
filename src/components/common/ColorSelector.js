import React from 'react'
import PropTypes from 'prop-types'
import { Select, MenuItem } from '@material-ui/core'

const ColorSelector = ({ value, onChange, colors }) => {
  return (
    <div className="color-selector">
      <Select
        variant="filled"
        name="eventColor"
        value={value}
        onChange={(e) => onChange(e.target.name, e.target.value)}
        label="Event color"
        renderValue={(selectedValue) => (
          <>
            <span style={{ backgroundColor: colors[selectedValue].hex }} className="color-option">
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
  )
}

ColorSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.object.isRequired,
}

export default ColorSelector
