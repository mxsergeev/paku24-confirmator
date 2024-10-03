import React from 'react'

export default function MessageBeforeButton({ text, className, ...rest }) {
  return (
    <div className={`message ${className}`} {...rest}>
      {text}
    </div>
  )
}
