import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

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
      <main className="container-page flex-1 pt-24 pb-6 sm:pt-24 sm:pb-8">
        <Outlet context={{ setHomeSearchSummary, setIsHeroSearchVisible }} />
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
