import React from 'react'
import "./Header.css";
import logo from '../../assets/images/logo.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const showLogin = location.pathname === "/";
  return (
    <header>
        <div className="logo">
            <img src={logo} alt="Rescue Now Logo" />
            <span>RESCUE.<div className='a'>Now</div></span>
        </div>

        <nav className='title'>
          
            <Link className='nav-btn' to="/introduce">Introduce</Link>
            <Link className='nav-btn' to="/contact">Contact</Link>
            {showLogin && (
          <button
            onClick={() => navigate("/home")}
          >
            Login
          </button>
        )}
        </nav>
    </header>
  )
}

export default Header;
