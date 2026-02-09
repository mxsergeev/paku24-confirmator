import React from 'react'
import { useHistory } from 'react-router-dom'
import { Button, Checkbox, FormControlLabel, FormGroup } from '@material-ui/core'
import feesData from '../../../data/fees.json'

import ResponsiveDialog from '../../ResponsiveDialog'

export default function FeeSeector({ fees, onChange, path = '' }) {
  const history = useHistory()

  return (
    <>
      <Button onClick={() => history.push(path)}>Fees</Button>

      <ResponsiveDialog path={path}>
        <FormGroup>
          {feesData.map((fee) => (
            <FormControlLabel
              key={fee.name}
              label={`${fee.label} (${fee.amount}€)`}
              control={
                <Checkbox
                  color="primary"
                  checked={fees.find((f) => f.name === fee.name) !== undefined}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange(fees.concat(fee))
                      return
                    }

                    onChange(fees.filter((f) => f.name !== fee.name))
                  }}
                />
              }
            />
          ))}
        </FormGroup>
      </ResponsiveDialog>
    </>
  )
}
