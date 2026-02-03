import { useNavigate } from "react-router-dom";
import "./Hero.css";

const CitizenHome = () => {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="hero-content">
        <h1>Citizen Portal</h1>
        <p>
          This portal is for citizens who need emergency support or rescue
          assistance.
        </p>

        <button
          className="hero-btn"
          onClick={() => navigate("/citizen/hero")}
        >
          Tiếp tục
        </button>
      </div>
    </section>
  );
};

export default CitizenHome;
