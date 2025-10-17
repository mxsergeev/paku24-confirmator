import {
  Button,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  TextField,
} from '@material-ui/core'
import MenuRoundedIcon from '@material-ui/icons/MenuRounded'
import React, { useState } from 'react'

export default function Address({
  value = {},
  onChange = () => {},
  style = {},
  showRemove = false,
}) {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null)

  const openMenu = (event) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const closeMenu = () => {
    setMenuAnchorEl(null)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        width: '100%',
        ...style,
      }}
    >
      <TextField
        style={{ flex: 3 }}
        required
        name="address"
        value={value.street}
        onChange={(e) => onChange({ ...value, street: e.target.value })}
        label="Address"
        variant="outlined"
        size="small"
      />
      <TextField
        style={{ flex: 1, minWidth: '4.75rem' }}
        required
        name="index"
        value={value.index}
        onChange={(e) => onChange({ ...value, index: e.target.value })}
        label="Index"
        variant="outlined"
        size="small"
      />
      <TextField
        style={{ flex: 2, minWidth: '4rem' }}
        className=""
        required
        name="city"
        value={value.city}
        onChange={(e) => onChange({ ...value, city: e.target.value })}
        label="City"
        variant="outlined"
        size="small"
      />

      <Button
        style={{
          minWidth: '2.5rem',
        }}
        size="small"
        aria-controls="more-address-actions"
        aria-haspopup="true"
        onClick={openMenu}
      >
        <MenuRoundedIcon />
      </Button>
      <Menu
        id="more-address-actions"
        anchorEl={menuAnchorEl}
        keepMounted
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
        PaperProps={{ style: { minWidth: '7.5rem' } }}
      >
        <MenuItem>
          <FormControl size="small" style={{ flex: 1, minWidth: '1.5rem' }}>
            <InputLabel htmlFor="address-floor">Floor</InputLabel>
            <Select
              native
              value={value.floor ?? 0}
              onChange={(e) => {
                onChange({ ...value, floor: e.target.value })
                closeMenu()
              }}
              inputProps={{
                name: 'floor',
                id: 'address-floor',
              }}
            >
              {Array.from({ length: 102 }, (_, i) => i - 2).map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </Select>
          </FormControl>
        </MenuItem>
        <MenuItem>
          <FormControl size="small" style={{ flex: 1, minWidth: '1.5rem' }}>
            <InputLabel htmlFor="address-elevator">Elevator</InputLabel>
            <Select
              native
              value={value.elevator ?? false}
              onChange={(e) => {
                onChange({ ...value, elevator: e.target.value === 'true' })
                closeMenu()
              }}
              inputProps={{
                name: 'elevator',
                id: 'address-elevator',
              }}
            >
              {/* eslint-disable-next-line react/jsx-boolean-value */}
              <option value={true}>✅</option>
              <option value={false}>❌</option>
            </Select>
          </FormControl>
        </MenuItem>
        {showRemove && (
          <MenuItem
            onClick={() => {
              onChange({ removeId: value.id })
              closeMenu()
            }}
          >
            Remove
          </MenuItem>
        )}
      </Menu>
    </div>
  )
}
