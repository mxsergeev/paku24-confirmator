import React from 'react'

export default function LoadingUntillDone({
  loading,
  redirectComponent = null,
  children,
}) {
  return (
    <>
      {loading && <p>Loading...</p>}
      {redirectComponent}
      {!loading && !redirectComponent && children}
    </>
  )
}
