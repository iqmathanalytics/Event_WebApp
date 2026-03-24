import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";

function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <Navbar />
      <main className="container-page mobile-safe-main flex-1 pt-20 pb-8 sm:pt-24 sm:pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-soft backdrop-blur-[1px] sm:p-6">
          <Outlet />
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default DashboardLayout;
