import { createContext, useEffect, useMemo, useState } from "react";
import { cities as staticCities } from "../utils/filterOptions";

const CityFilterContext = createContext(null);

function getStoredCity() {
  return localStorage.getItem("selectedCity") || "";
}

export function CityFilterProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(getStoredCity());
  const cities = staticCities;
  const citiesLoading = false;

  useEffect(() => {
    localStorage.setItem("selectedCity", selectedCity || "");
  }, [selectedCity]);

  useEffect(() => {
    if (!selectedCity) {
      return;
    }
    if (!cities.some((item) => item.value === selectedCity)) {
      setSelectedCity("");
    }
  }, [cities, selectedCity]);

  const selectedCityLabel = useMemo(() => {
    return cities.find((item) => item.value === selectedCity)?.label || "All Cities";
  }, [cities, selectedCity]);

  const value = useMemo(
    () => ({
      cities,
      citiesLoading,
      selectedCity,
      selectedCityLabel,
      setSelectedCity
    }),
    [cities, citiesLoading, selectedCity, selectedCityLabel]
  );

  return <CityFilterContext.Provider value={value}>{children}</CityFilterContext.Provider>;
}

export default CityFilterContext;
