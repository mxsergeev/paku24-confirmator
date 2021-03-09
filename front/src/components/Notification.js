import React from 'react'
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined'

const Notification = ({ notification }) => {
  let color = 'black'
  if (notification.toLowerCase().includes('error')) color = 'red'

  return (
    <>
      {notification ? (
        <div
          style={{
            backgroundColor: 'white',
            color,
            padding: '10px',
            width: '80%',
            borderBottom: '3px solid darkgrey',
            fontSize: 'small',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <InfoOutlinedIcon />
          <span style={{ marginLeft: '10px' }}>{notification}</span>
        </div>
      ) : null}
    </>
  )
}

export default Notification
