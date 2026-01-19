import React from 'react'
import './Header.css'
import logo from '../assets/logo.png'

const Header = () => {
  return (
    <header>
        <div className="logo">
            <img src={logo} alt="Rescue Now Logo" />
            <span>RESCUE.<div className='a'>Now</div></span>
        </div>

        <nav>
            <a href="#">Introduce</a>
            <a href="#">Contact</a>
        </nav>
    </header>
  )
}

export default Header
