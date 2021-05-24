import React from 'react'
import { Link } from 'react-router-dom'
import './Header.css'
import logo from '../assets/paku24-logo.png'

export default function Header({ isLogged }) {
  return (
    <div className="logo">
      <div>
        <Link to={isLogged ? '/confirmator' : '/login'}>
          <img src={logo} alt="Logo" width="125px" />
        </Link>
        <span className="text">CONFIRMATOR</span>
      </div>
    </div>
  )
}
