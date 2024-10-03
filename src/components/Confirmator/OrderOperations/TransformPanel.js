import React from 'react'
import TransformButton from './TransformButton'
import CopyButton from './CopyButton'

export default function TransformPanel({
  handleOrderTransformFromText,
  handleOrderTransformFromEditor,
  transformDisabled,
  copyDisabled,
  elementRef,
}) {
  return (
    <div className="order-operations">
      <div className="block">
        <CopyButton disabled={copyDisabled} elementRef={elementRef} />
        <TransformButton
          text="from text"
          disabled={transformDisabled}
          handleClick={handleOrderTransformFromText}
        />

        <TransformButton text="from editor" handleClick={handleOrderTransformFromEditor} />
      </div>
    </div>
  )
}
