import React from 'react'
import Button from '@material-ui/core/Button'
import FileCopyIcon from '@material-ui/icons/FileCopy'
import Toast from 'light-toast'

export default function CopyButton({ inputRef }) {
  function copyToClipboard() {
    inputRef.current.select()
    document.execCommand('copy')
  }

  function handleCopying() {
    copyToClipboard()
    Toast.info('Copied!', 500)
  }

  return (
    <Button
      className="button-one-third flex-item"
      variant="text"
      size="small"
      onClick={handleCopying}
    >
      Copy <FileCopyIcon />
    </Button>
  )
}
