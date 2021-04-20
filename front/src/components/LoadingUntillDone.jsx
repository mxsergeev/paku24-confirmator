import React from 'react'

export default function LoadingUntillDone({
  loading,
  redirectComponent = null,
  targetComponent,
}) {
  return (
    <>
      {loading && <p>Loading...</p>}
      {redirectComponent}
      {!loading && !redirectComponent && targetComponent}
    </>
  )
}
