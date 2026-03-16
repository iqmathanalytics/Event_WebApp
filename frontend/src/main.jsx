import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { CityFilterProvider } from "./context/CityFilterContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <CityFilterProvider>
        <App />
      </CityFilterProvider>
    </AuthProvider>
  </BrowserRouter>
);
