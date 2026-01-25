import React from 'react'
import logo from '../../../assets/logo.png'
import nen from '../../../assets/nen.png'
import "../../../layout/citizen/Header.css";
import "../../../layout/citizen/OnTheWay.css";

const OnTheWay = () => {
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

      <h1>Đội cứu hộ đang đến</h1>
      <iframe
        title="Rescue Map"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.459118580845!2d106.700981!3d10.776889"
        width="70%"
        height="450"
        style={{ border: 0, marginTop: "150px" }}
        allowFullScreen=""
        loading="lazy"
      />
    </div>
  )
}

export default OnTheWay
