import React from 'react'
import FormLabel from '@material-ui/core/FormLabel'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Radio from '@material-ui/core/Radio'
import RadioGroup from '@material-ui/core/RadioGroup'
import colors from '../../data/colors.json'
import ColorSelector from '../common/ColorSelector'

export default function CheckboxGroup(props) {
  const { handleChange, order } = props

  return (
    <div className="checkbox-container">
      <FormControl className="checkbox-distance flex-item" hiddenLabel={false} size="small">
        <FormLabel component="legend">Pick one:</FormLabel>
        <RadioGroup
          value={order.distance}
          onChange={(e) => handleChange(e.target.name, e.target.value)}
        >
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

          <ColorSelector value={order?.eventColor} onChange={handleChange} colors={colors} />
        </div>

        <FormControlLabel
          size="small"
          className="flex-item"
          control={
            <Checkbox
              checked={order.hsy}
              onChange={(e) => handleChange('hsy', e.target.checked)}
              color="primary"
            />
          }
          name="hsy"
          label="♻ HSY"
          labelPlacement="start"
        />

        <FormControlLabel
          style={{ display: 'none' }}
          className="flex-item"
          control={
            <Checkbox
              checked={order.XL}
              onChange={(e) => handleChange('XL', e.target.checked)}
              color="primary"
            />
          }
          name="XL"
          label="XL"
          labelPlacement="start"
        />
      </FormControl>
    </div>
  )
}
