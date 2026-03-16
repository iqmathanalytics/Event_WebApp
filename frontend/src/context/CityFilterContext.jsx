import { createContext, useEffect, useMemo, useState } from "react";
import { cities } from "../utils/filterOptions";

const CityFilterContext = createContext(null);

function getStoredCity() {
  return localStorage.getItem("selectedCity") || "";
}

export function CityFilterProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(getStoredCity());

  useEffect(() => {
    localStorage.setItem("selectedCity", selectedCity || "");
  }, [selectedCity]);

  const selectedCityLabel = useMemo(() => {
    return cities.find((item) => item.value === selectedCity)?.label || "All Cities";
  }, [selectedCity]);

  const value = useMemo(
    () => ({
      selectedCity,
      selectedCityLabel,
      setSelectedCity
    }),
    [selectedCity, selectedCityLabel]
  );

  return <CityFilterContext.Provider value={value}>{children}</CityFilterContext.Provider>;
}

export default CityFilterContext;
