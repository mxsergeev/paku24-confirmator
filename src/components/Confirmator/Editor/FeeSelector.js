import React from 'react'
import { useHistory } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
} from '@material-ui/core'
import feesData from '../../../data/fees.json'

import ResponsiveDialog from '../../ResponsiveDialog'

export default function FeeSelector({ manualFees, autoFees, onChange, path = '' }) {
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
                  checked={
                    manualFees ? manualFees.find((f) => f.name === fee.name) !== undefined : false
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newManual = manualFees ? manualFees.concat(fee) : [fee]
                      onChange(newManual)
                      return
                    }

                    if (!manualFees) return
                    onChange(manualFees.filter((f) => f.name !== fee.name))
                  }}
                />
              }
            />
          ))}
        </FormGroup>

        {manualFees !== null && (
          <Box mt={1}>
            <Typography variant="caption" color="textSecondary">
              Suggested fees
            </Typography>

            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              mt={0.5}
            >
              <Box display="flex" flexWrap="wrap" alignItems="center">
                {autoFees && autoFees.length ? (
                  autoFees.map((f) => (
                    <Chip
                      key={f.name}
                      label={`${f.label} (${f.amount}€)`}
                      size="small"
                      style={{ marginRight: 6, marginBottom: 6 }}
                    />
                  ))
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    —
                  </Typography>
                )}
              </Box>

              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  color="default"
                  onClick={() => onChange(null)}
                >
                  Restore suggested
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </ResponsiveDialog>
    </>
  )
}
