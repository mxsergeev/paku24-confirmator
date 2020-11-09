import React, { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import Convert from './components/Convert'


function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{color: 'red'}}>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function App() {
  const [text, setText] = useState('')

  return (
    <div>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          setText('')
        }}
        resetKeys={[text]}
      >
        <Convert text={text} setText={setText}/>
      </ErrorBoundary>
    
    </div>
  );
}

export default App;
