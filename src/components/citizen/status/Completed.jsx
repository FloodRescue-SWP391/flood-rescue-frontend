import React from 'react'
import logo from '../../../assets/logo.png'
import nen from '../../../assets/nen.png'
import "../../../layout/citizen/Header.css";
import "../../../layout/citizen/Completed.css";



const Completed = () => {
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

        
    <div className='noi-dung2'>
      <h1>✅ Nhiệm vụ đã hoàn thành</h1>
      <p>Cảm ơn bạn đã sử dụng Rescue.Now</p>
      </div>

     
    </div>
  );
};

export default Completed;
