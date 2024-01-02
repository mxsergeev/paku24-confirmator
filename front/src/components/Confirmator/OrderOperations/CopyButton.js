import React from 'react'
import Button from '@material-ui/core/Button'
import FileCopyIcon from '@material-ui/icons/FileCopy'
import { enqueueSnackbar } from 'notistack'

export default function CopyButton({ elementRef, disabled }) {
  function copyToClipboard() {
    const tempTextarea = document.createElement('textarea')
    document.body.appendChild(tempTextarea)
    // getting text from container (div) or from textarea that holds the transformed order
    tempTextarea.value = elementRef.current.innerText || elementRef.current.defaultValue
    tempTextarea.select()
    document.execCommand('copy')
    document.body.removeChild(tempTextarea)
  }

  function handleCopying() {
    copyToClipboard()
    enqueueSnackbar('Copied!', { autoHideDuration: 750 })
  }

  return (
    <Button
      disabled={disabled}
      className="button-one-third flex-item"
      variant="outlined"
      size="small"
      onClick={handleCopying}
    >
      Copy <FileCopyIcon />
    </Button>
  )
}
