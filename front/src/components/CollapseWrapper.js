/* eslint-disable react/jsx-indent */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Collapse, IconButton, Button } from '@material-ui/core'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import React, { useState } from 'react'

export default function CollapseWrapper({
  open,
  clickable = true,
  label,
  icon,
  style,
  containerStyle,
  children,
}) {
  const [isExpanded, setExpanded] = useState(false)

  const Title =
    typeof label === 'object'
      ? () => label
      : () => (
          <Button
            style={{
              marginLeft: 0,
              paddingLeft: '0.5rem',
              marginRight: 0,
              paddingRight: '0.5rem',
            }}
            variant="text"
            size="small"
            label={label}
          />
        )

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: clickable ? 'pointer' : 'auto',
          pointerEvents: clickable ? 'all' : 'none',
          ...style,
        }}
        onClick={() => setExpanded(!isExpanded)}
      >
        {icon}
        <Title />
        {clickable && (
          <IconButton style={{ padding: 0 }} size="small" onClick={() => setExpanded(!isExpanded)}>
            <ExpandMoreIcon
              style={{
                transform: isExpanded ? 'rotate(0.5turn)' : '',
              }}
            />
          </IconButton>
        )}
      </div>
      <Collapse in={open || isExpanded}>{children}</Collapse>
    </div>
  )
}
