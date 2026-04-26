import { createContext, useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCitiesLoading(true);
        const res = await fetchCities({ limit: 8000 });
        const rows = Array.isArray(res?.data) ? res.data : [];
        const ordered = orderAllowedCities(rows);
        if (!cancelled) {
          setCities(ordered);
        }
      } catch (_err) {
        if (!cancelled) {
          setCities([]);
        }
      } finally {
        if (!cancelled) {
          setCitiesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
