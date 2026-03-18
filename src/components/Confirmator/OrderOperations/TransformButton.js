import React from 'react'
import Button from '@material-ui/core/Button'
import TransformIcon from '@material-ui/icons/Transform'

export default function TransformButton({
  handleClick,
  text = 'Transform',
  icon: Icon = TransformIcon,
  ...rest
}) {
  return (
    <Button
      className="button-one-third flex-item"
      variant="outlined"
      size="small"
      style={{ fontSize: '0.8rem', padding: '1px' }}
      onClick={() => handleClick()}
      {...rest}
    >
      <Icon />
      {text}
    </Button>
  )
}
