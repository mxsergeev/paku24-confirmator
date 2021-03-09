import React from 'react'
import FormLabel from '@material-ui/core/FormLabel'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Radio from '@material-ui/core/Radio'
import RadioGroup from '@material-ui/core/RadioGroup'

export default function CheckboxGroup(props) {
  const { handleChange, options } = props

  return (
    <div className="checkbox-container">
      <FormControl
        className="checkbox-distance flex-item"
        hiddenLabel={false}
        size="small"
      >
        <FormLabel component="legend">Pick one:</FormLabel>
        <RadioGroup
          name="gender1"
          value={options.distance}
          onChange={handleChange}
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
      <FormControl className="basic-flex" size="small">
        <FormControlLabel
          size="small"
          className="flex-item"
          control={
            <Checkbox
              checked={options.hsy}
              onChange={handleChange}
              color="primary"
            />
          }
          name="hsy"
          label="♻ HSY"
          labelPlacement="start"
        />
        <FormControlLabel
          className="flex-item"
          control={
            <Checkbox
              checked={options.secondCar}
              onChange={handleChange}
              color="primary"
            />
          }
          name="secondCar"
          label="Second car"
          labelPlacement="start"
        />
        <FormControlLabel
          className="flex-item"
          control={
            <Checkbox
              checked={options.XL}
              onChange={handleChange}
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
