import React from 'react'
import "./Header.css";
import logo from '../../assets/images/logo.png';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header>
        <div className="logo">
            <img src={logo} alt="Rescue Now Logo" />
            <span>RESCUE.<div className='a'>Now</div></span>
        </div>

        <nav className='title'>
            <Link className='nav-btn' to="/introduce">Introduce</Link>
            <Link className='nav-btn' to="/contact">Contact</Link>
        </nav>
    </header>
  )
}

export default Header;
