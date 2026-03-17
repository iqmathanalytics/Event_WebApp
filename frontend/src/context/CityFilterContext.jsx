import { createContext, useEffect, useMemo, useState } from "react";
import { fetchCities } from "../services/metaService";

const CityFilterContext = createContext(null);
const CITY_CACHE_KEY = "cityOptionsCacheV1";

function getStoredCity() {
  return localStorage.getItem("selectedCity") || "";
}

function getCachedCities() {
  try {
    const raw = localStorage.getItem(CITY_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

export function CityFilterProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(getStoredCity());
  const [cities, setCities] = useState(getCachedCities());
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("selectedCity", selectedCity || "");
  }, [selectedCity]);

  useEffect(() => {
    let active = true;
    async function loadCities() {
      try {
        setCitiesLoading(true);
        const response = await fetchCities();
        if (!active) {
          return;
        }
        const rows = Array.isArray(response?.data) ? response.data : [];
        setCities(rows);
        localStorage.setItem(CITY_CACHE_KEY, JSON.stringify(rows));
      } catch (_err) {
        if (active) {
          setCities((prev) => (prev.length ? prev : []));
        }
      } finally {
        if (active) {
          setCitiesLoading(false);
        }
      }
    }
    loadCities();
    return () => {
      active = false;
    };
  }, []);

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
