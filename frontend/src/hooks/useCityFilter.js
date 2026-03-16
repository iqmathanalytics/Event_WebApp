import { useContext } from "react";
import CityFilterContext from "../context/CityFilterContext";

function useCityFilter() {
  const ctx = useContext(CityFilterContext);
  if (!ctx) {
    throw new Error("useCityFilter must be used within CityFilterProvider");
  }
  return ctx;
}

export default useCityFilter;
