/* eslint-disable react/no-array-index-key */
/* eslint-disable react/destructuring-assignment */
import React from 'react'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import withEditing from '../withEditing'
import './orderContainers.css'

export default function TransformedOrderContainer({
  elementRef,
  handleClick,
  transformedOrderText,
}) {
  const Editable = ({ handleChange, content }) => (
    <TextareaAutosize
      onChange={handleChange}
      value={content}
      ref={elementRef}
      style={{ marginTop: '10px' }}
      className="width-100"
      rowsMin={5}
      cols={40}
      placeholder="Transformed order."
    />
  )

  const NotEditable = ({ content, button }) => (
    <div
      ref={elementRef}
      style={{ width: transformedOrderText && '100%', marginTop: '12px' }}
      className="not-editable-container"
    >
      {content.length === 0 ? (
        'Transformed order'
      ) : (
        <div className="text-container-with-scroll">
          {content.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
      {button}
    </div>
  )
  const ContainerWithEditing = withEditing(Editable, NotEditable)
  return <ContainerWithEditing handleUpdate={handleClick} content={transformedOrderText} />
}
