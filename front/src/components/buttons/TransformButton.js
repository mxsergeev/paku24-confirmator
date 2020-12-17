import React from 'react'
import Button from '@material-ui/core/Button'
import '../../styles/convert.css'
import TransformIcon from '@material-ui/icons/Transform'

export default function TransformButton({ handleClick }) {

  return (
    <Button
      className="button-one-third flex-item" 
      variant="text" 
      size="small" 
      onClick={handleClick}>
        Transform <TransformIcon />
    </Button>
  )
}