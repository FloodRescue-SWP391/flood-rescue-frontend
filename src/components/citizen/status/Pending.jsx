import React from 'react'
import logo from '../../../assets/logo.png'
import nen from '../../../assets/nen.png'
import "../../../layout/citizen/Header.css";

import "../../../layout/citizen/Pending.css";

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
              </nav>
      </header>
      <div className='background'>
        <img src={nen} alt="" />
      </div>
         <div className='noi-dung'> 
          <h1>Yêu cầu đang được xử lý.....</h1>
          <p>Vui lòng đợi vài giây...</p>
        </div>
    </div>
  )
}

export default Pending
