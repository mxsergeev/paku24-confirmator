import React, { useState } from 'react'
import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import EditOutlinedIcon from '@material-ui/icons/EditOutlined'
import './withEditing.css'

const withEditing = (EditableComponent, NotEditableComponent) => ({
  content,
  handleUpdate,
  ...rest
}) => {
  const [isEditable, setIsEditable] = useState(false)
  const [savedChanges, setSavedChanges] = useState(content)
  const [incomingChanges, setIncomingChanges] = useState(savedChanges)

  function removeUnsavedChanges() {
    setIncomingChanges(savedChanges)
  }

  function handleIncomingChanges(e) {
    setIncomingChanges(e.target.value)
  }

  function handleCancelClick() {
    removeUnsavedChanges()
    setIsEditable(!isEditable)
  }

  function handleSaveClick() {
    setSavedChanges(incomingChanges)
    handleUpdate(incomingChanges)
    setIsEditable(!isEditable)
  }

  function handleEditClick() {
    setIsEditable(!isEditable)
  }

  function notEditable() {
    return (
      <>
        <NotEditableComponent
          content={content}
          button={
            <span>
              <IconButton size="small" onClick={handleEditClick}>
                <EditOutlinedIcon style={{ width: '20px' }} />
              </IconButton>
            </span>
          }
          {...rest}
        />
      </>
    )
  }
  function editable() {
    return (
      <>
        <EditableComponent
          content={incomingChanges}
          handleChange={handleIncomingChanges}
          {...rest}
        />
        <div className="buttons-block">
          <Button size="small" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button className="primary" size="small" onClick={handleSaveClick}>
            Save
          </Button>
        </div>
      </>
    )
  }

  return <>{isEditable ? editable() : notEditable()}</>
}

export default withEditing
