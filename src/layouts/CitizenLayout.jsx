import Header from "@/components/common/Header";
import { Outlet } from "react-router-dom";

const CitizenLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default CitizenLayout;
