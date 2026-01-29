import React from 'react'
import "../../layout/citizen/Header.css";

import logo from '../../assets/logo.png'
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header>
        <div className="logo">
            <img src={logo} alt="Rescue Now Logo" />
            <span>RESCUE.<div className='a'>Now</div></span>
        </div>

        <nav>
            <Link className='nav-btn' to="/introduce">Giới thiệu</Link>
            <Link className='nav-btn' to="/contact">Liên hệ</Link>
        </nav>
    </header>
  )
}

export default Header;
