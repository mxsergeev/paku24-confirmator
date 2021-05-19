import React from 'react'
import logoutService from '../services/logout'
import LogoutButton from './LogoutButton'

export default function Footer({ user, logoutUser }) {
  return (
    <div
      style={{
        backgroundColor: 'darkgrey',
        padding: '15px',
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        borderTop: '3.5px solid lightgrey',
      }}
    >
      <div style={{ paddingTop: '2px', marginRight: '20px' }}>
        <span style={{ fontFamily: 'monospace' }}>
          {' '}
          {user.username}
          <br />
          {user.name}
        </span>
      </div>
      <LogoutButton handleClick={() => logoutService.logout().then(logoutUser)} />
    </div>
  )
}
