import "./utils/homeSplashPolicy";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { CityFilterProvider } from "./context/CityFilterContext";
import { RouteContentReadyProvider } from "./context/RouteContentReadyContext";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

const app = (
  <BrowserRouter>
    <AuthProvider>
      <CityFilterProvider>
        <RouteContentReadyProvider>
          <App />
        </RouteContentReadyProvider>
      </CityFilterProvider>
    </AuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider> : app
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
