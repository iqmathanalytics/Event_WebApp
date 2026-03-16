import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <Navbar />
      <main className="container-page flex-1 pt-24 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-soft backdrop-blur-[1px] sm:p-6">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default DashboardLayout;
