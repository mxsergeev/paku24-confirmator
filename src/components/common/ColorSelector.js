import React from 'react'
import PropTypes from 'prop-types'
import { Select, MenuItem } from '@material-ui/core'
import './ColorSelector.css'

const ColorSelector = ({ value, automaticColorId, onChange, colors }) => {
  const selectedValue = value ?? ''
  const automaticColor = colors[automaticColorId]

  return (
    <div className="color-selector">
      <Select
        variant="outlined"
        name="eventColor"
        value={selectedValue}
        displayEmpty
        margin="dense"
        onChange={(e) => onChange(e.target.name, e.target.value || null)}
        label="Event color"
        renderValue={(selectedColorId) => {
          const selectedColor = colors[selectedColorId]
          if (!selectedColor) {
            return automaticColor ? (
              <span style={{ backgroundColor: automaticColor.hex }} className="color-option" />
            ) : null
          }

          return (
            <span style={{ backgroundColor: selectedColor.hex }} className="color-option">
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          )
        }}
      >
        <MenuItem value="">
          {automaticColor && (
            <span style={{ backgroundColor: automaticColor.hex, marginRight: '0.5rem' }} className="color-option" />
          )}
          Automatic
        </MenuItem>
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
  automaticColorId: PropTypes.string,
}

export default ColorSelector
