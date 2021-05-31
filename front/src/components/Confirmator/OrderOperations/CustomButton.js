import React from 'react'
import Button from '@material-ui/core/Button'

export default function CustomButton({ handleClick, isDisabled, grayScale, content, className }) {
  const style = grayScale && { color: 'grey' }
  return (
    <Button
      disabled={isDisabled}
      className={className}
      variant="contained"
      size="small"
      onClick={handleClick}
    >
      <span style={{ display: 'flex', ...style }}>{content}</span>
    </Button>
  )
}
