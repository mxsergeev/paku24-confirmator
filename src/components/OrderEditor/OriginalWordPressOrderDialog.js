import React, { useState } from 'react'

export default function OriginalWordPressOrderDialog({ order }) {
  const [open, setOpen] = useState(false)
  if (!order) return null

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        View original WordPress order
      </button>
      {open && (
        <div role="dialog" aria-label="Original WordPress order">
          <h2>Original WordPress order</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(order, null, 2)}
          </pre>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </>
  )
}
