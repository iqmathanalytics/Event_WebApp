import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";

function MainLayout() {
  const [homeSearchSummary, setHomeSearchSummary] = useState({
    cityLabel: "Anywhere",
    dateLabel: "Any date",
    categoryLabel: "Any category",
    priceLabel: "Any price"
  });
  const [isHeroSearchVisible, setIsHeroSearchVisible] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <Navbar homeSearchSummary={homeSearchSummary} isHeroSearchVisible={isHeroSearchVisible} />
      <main className="container-page mobile-safe-main flex-1 pt-20 pb-8 sm:pt-24 sm:pb-10">
        <Outlet context={{ setHomeSearchSummary, setIsHeroSearchVisible }} />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default MainLayout;
