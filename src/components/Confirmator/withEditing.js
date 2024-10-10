import React, { useCallback, useState } from 'react'
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

  const removeUnsavedChanges = useCallback(() => {
    setIncomingChanges(savedChanges)
  }, [savedChanges])

  const handleIncomingChanges = useCallback((e) => {
    setIncomingChanges(e.target.value)
  }, [])

  const handleCancelClick = useCallback(() => {
    removeUnsavedChanges()
    setIsEditable((prev) => !prev)
  }, [removeUnsavedChanges])

  const handleSaveClick = useCallback(() => {
    setSavedChanges(incomingChanges)
    handleUpdate(incomingChanges)
    setIsEditable((prev) => !prev)
  }, [incomingChanges, handleUpdate])

  const handleEditClick = useCallback(() => {
    setIsEditable((prev) => !prev)
  }, [])

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
