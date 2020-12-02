import React from "react"
import FormLabel from '@material-ui/core/FormLabel'
import FormControl from '@material-ui/core/FormControl'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';

export default function CheckboxGroup(props) {
  const { handleChange, options } = props

  return (
    <div className="checkbox-container">
    <FormControl
      className="checkbox-distance flex-item" 
      hiddenLabel={false}
      size='small'
    >
      <FormLabel component="legend">Pick one:</FormLabel>
      <RadioGroup name="gender1" value={options.distance} onChange={handleChange}>
        <FormControlLabel value="insideCapital" control={<Radio />} label="🏙 Inside capital" />
        <FormControlLabel value="outsideCapital" control={<Radio />} label="🏞 Outside capital" />
        <FormControlLabel value="fromCapitalToOutside" control={<Radio />} label="🏙->🏞 From capital" />
        <FormControlLabel value="fromOutsideToCapital" control={<Radio />} label="🏞->🏙 To capital" />
      </RadioGroup>
    </FormControl>
    <FormControlLabel
      className='checkbox-hsy flex-item'
      control={<Checkbox checked={options.hsy} onChange={handleChange} />}
      name="hsy"
      label="♻ HSY"
      labelPlacement="start"
    />
    </div>
  )
}