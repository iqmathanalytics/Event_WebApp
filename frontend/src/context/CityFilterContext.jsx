import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { orderAllowedCities } from "../utils/filterOptions";
import { fetchCities } from "../services/metaService";

const CityFilterContext = createContext(null);

function getStoredCity() {
  return localStorage.getItem("selectedCity") || "";
}

export function CityFilterProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(getStoredCity());
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const loadCities = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setCitiesLoading(true);
      }
      const res = await fetchCities();
      const rows = Array.isArray(res?.data) ? res.data : [];
      setCities(orderAllowedCities(rows));
    } catch (_err) {
      setCities([]);
    } finally {
      if (!silent) {
        setCitiesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  useEffect(() => {
    const refreshCities = () => void loadCities({ silent: true });
    window.addEventListener("bmt:cities-cache-cleared", refreshCities);
    return () => window.removeEventListener("bmt:cities-cache-cleared", refreshCities);
  }, [loadCities]);

  useEffect(() => {
    localStorage.setItem("selectedCity", selectedCity || "");
  }, [selectedCity]);

  useEffect(() => {
    if (citiesLoading) {
      return;
    }
    if (!selectedCity) {
      return;
    }
    if (!cities.some((item) => item.value === selectedCity)) {
      setSelectedCity("");
    }
  }, [cities, citiesLoading, selectedCity]);

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
