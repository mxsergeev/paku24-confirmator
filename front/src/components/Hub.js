import { Button } from '@material-ui/core'
import React from 'react'
import { useHistory } from 'react-router-dom'
import './Hub.css'

export default function Hub() {
  const history = useHistory()

  function handleBlockClick(e) {
    history.push(e.currentTarget.name)
  }
  return (
    <div className="hub">
      <Button
        onClick={handleBlockClick}
        name="confirmator"
        variant="contained"
        className="hub-block"
      >
        Confirmator
      </Button>

      <Button
        onClick={handleBlockClick}
        name="statistics"
        variant="contained"
        className="hub-block"
      >
        Statistics
      </Button>
    </div>
  )
}
