import React from 'react'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import withEditing from '../withEditing'

export default function RawOrderContainer({ handleClick, rawOrderText, elementRef }) {
  const Editable = ({ handleChange, content }) => (
    <TextareaAutosize
      onChange={handleChange}
      value={content}
      style={{ marginTop: '10px' }}
      className="width-100"
      rowsMin={5}
      cols={40}
      placeholder="Raw order here."
    />
  )

  const NotEditable = ({ button }) => (
    <div ref={elementRef} className="not-editable-container">
      Raw order{button}
    </div>
  )
  const ContainerWithEditing = withEditing(Editable, NotEditable)
  return (
    <ContainerWithEditing
      style={{ width: 'max-content' }}
      handleUpdate={handleClick}
      content={rawOrderText}
    />
  )
}
