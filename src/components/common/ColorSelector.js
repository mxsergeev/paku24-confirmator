import React from 'react'
import PropTypes from 'prop-types'
import { Select, MenuItem } from '@material-ui/core'

const ColorSelector = ({ value, onChange, colors }) => {
  const selectedValue = value ?? ''

  return (
    <div className="color-selector">
      <Select
        variant="filled"
        name="eventColor"
        value={selectedValue}
        onChange={(e) => onChange(e.target.name, e.target.value || null)}
        label="Event color"
        renderValue={(selectedColorId) => {
          const selectedColor = colors[selectedColorId]
          if (!selectedColor) return 'Automatic'

          return (
            <span style={{ backgroundColor: selectedColor.hex }} className="color-option">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          )
        }}
      >
        <MenuItem value="">Automatic</MenuItem>
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
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  colors: PropTypes.object.isRequired,
}

export default ColorSelector
