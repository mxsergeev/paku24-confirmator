import React from 'react'
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline'
import TransformButton from './TransformButton'
import CopyButton from './CopyButton'

export default function TransformPanel({
  handleOrderTransformFromEditor,
  copyDisabled,
  onClear,
  elementRef,
}) {
  return (
    <div className="order-operations">
      <div className="block">
        <CopyButton disabled={copyDisabled} elementRef={elementRef} />
        <TransformButton text="clear" handleClick={onClear} icon={DeleteOutlineIcon} />

        <TransformButton text="from editor" handleClick={handleOrderTransformFromEditor} />
      </div>
    </div>
  )
}
