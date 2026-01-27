import React, { useEffect, useState } from "react";
import Pending from "./status/Pending";
import OnTheWay from "./status/OnTheWay";
import Completed from "./status/Completed";
import "../../layout/citizen/requestStatus.css";

const RequestStatus = () => {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("currentRequestId");
    const list = JSON.parse(localStorage.getItem("rescueRequests")) || [];
    const found = list.find(r => r.id == id);
    setRequest(found);
  }, []);

  if (!request) {
    return <p>Không tìm thấy yêu cầu cứu hộ</p>;
  }

  return (
    <div className="request-status-page">
      {request.status === "PENDING" && <Pending />}
      {request.status === "ON_THE_WAY" && <OnTheWay />}
      {request.status === "COMPLETED" && <Completed />}
    </div>
  );
};

export default RequestStatus;
