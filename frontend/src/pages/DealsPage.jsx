import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DealCard from "../components/DealCard";
import EventFilterBar from "../components/EventFilterBar";
import { fetchDeals } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";

function DealsPage() {
  const { selectedCity, setSelectedCity } = useCityFilter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(selectedCity || "");
  const [sortBy, setSortBy] = useState("popularity");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    city: selectedCity || "",
    category: "",
    date: "",
    priceMin: "",
    priceMax: "",
    sortBy: "popularity"
  });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const canApply =
    query !== appliedFilters.query ||
    city !== appliedFilters.city ||
    category !== appliedFilters.category ||
    date !== appliedFilters.date ||
    priceMin !== appliedFilters.priceMin ||
    priceMax !== appliedFilters.priceMax ||
    sortBy !== appliedFilters.sortBy;

  const applyFilters = () => {
    setAppliedFilters({
      query,
      city,
      category,
      date,
      priceMin,
      priceMax,
      sortBy
    });
  };

  const setCityWithGlobal = (value) => {
    setCity(value);
    setSelectedCity(value);
  };

  const resetFilters = () => {
    setQuery("");
    setCityWithGlobal("");
    setSortBy("popularity");
    setCategory("");
    setDate("");
    setPriceMin("");
    setPriceMax("");
    setAppliedFilters({
      query: "",
      city: "",
      category: "",
      date: "",
      priceMin: "",
      priceMax: "",
      sortBy: "popularity"
    });
  };

  useEffect(() => {
    setCity(selectedCity || "");
    setAppliedFilters((prev) => ({
      ...prev,
      city: selectedCity || ""
    }));
  }, [selectedCity]);

  useEffect(() => {
    let active = true;

    async function loadDeals() {
      try {
        setLoading(true);
        const response = await fetchDeals({
          q: appliedFilters.query || undefined,
          city: appliedFilters.city || undefined,
          category: appliedFilters.category || undefined,
          date: appliedFilters.date || undefined,
          price_min: appliedFilters.priceMin || undefined,
          price_max: appliedFilters.priceMax || undefined,
          sort: appliedFilters.sortBy
        });

        if (active) {
          setList(response?.data || []);
        }
      } catch (_err) {
        if (active) {
          setList([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDeals();
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Deals</h1>
        <p className="text-sm text-slate-600">Browse limited-time local offers from trusted partners across your city.</p>
      </div>
      <EventFilterBar
        query={query}
        setQuery={setQuery}
        city={city}
        setCity={setCityWithGlobal}
        category={category}
        setCategory={setCategory}
        date={date}
        setDate={setDate}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onApply={applyFilters}
        onReset={resetFilters}
        canApply={canApply}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div key={`deal-skeleton-${idx}`} className="h-[320px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))
          : null}
        {!loading && list.length === 0 ? <p className="text-sm text-slate-500">No deals match your current filters.</p> : null}
        {!loading
          ? list.map((item) => (
              <DealCard
                key={item.id}
                item={{
                  id: item.id,
                  title: item.title,
                  city: item.city_name || "City",
                  discount: item.original_price
                    ? Math.max(0, Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100))
                    : 0,
                  originalPrice: item.original_price || item.discounted_price || 0,
                  price: item.discounted_price || item.original_price || 0,
                  image: item.image_url
                }}
                isFavorite={isFavorite("deal", item.id)}
                onToggleFavorite={() =>
                  toggleFavorite({
                    listingType: "deal",
                    listingId: item.id
                  })
                }
              />
            ))
          : null}
      </div>
    </motion.div>
  );
}

export default DealsPage;
