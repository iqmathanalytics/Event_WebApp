import "./utils/homeSplashPolicy";
import { initGoogleAnalytics } from "./utils/googleAnalytics";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { CityFilterProvider } from "./context/CityFilterContext";
import { RouteContentReadyProvider } from "./context/RouteContentReadyContext";

initGoogleAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <FavoritesProvider>
        <CityFilterProvider>
          <RouteContentReadyProvider>
            <App />
          </RouteContentReadyProvider>
        </CityFilterProvider>
      </FavoritesProvider>
    </AuthProvider>
  </BrowserRouter>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {});
      });
    });
  });
}
