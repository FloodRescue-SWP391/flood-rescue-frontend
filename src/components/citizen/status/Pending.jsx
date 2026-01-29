import React from 'react'
import logo from '../../../assets/logo.png'
import nen from '../../../assets/nen.png'
import "../../../layout/citizen/Header.css";

import "../../../layout/citizen/Pending.css";
import { Link } from 'react-router-dom';

const Pending = () => {
  return (
    <div className='lon'>
     
    <header>
              <div className="logo">
                  <img src={logo} alt="Rescue Now Logo" />
                  <span>RESCUE.<div className='a'>Now</div></span>
              </div>
      
              <nav>
                  <a href="#">Introduce</a>
                  <a href="#">Contact</a>
                   <Link className='nav-btn' to="/introduce">Giới thiệu</Link>
                  <Link className='nav-btn' to="/contact">Liên hệ</Link>
              </nav>
    </header>

    <div className='background'>
        <img src={nen} alt="" />
    </div>

    <div className='noi-dung'> 
          <h1>Yêu cầu đang được xử lý.....</h1>
          <p>Vui lòng đợi vài giây...</p>
         <div className='noi-dung5'> 
          <h1>Yêu cầu đang được xử lý.....</h1>
        </div>
    </div>

    </div>
  )
}

export default Pending
