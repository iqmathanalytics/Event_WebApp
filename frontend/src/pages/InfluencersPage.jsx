import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import InfluencerCard from "../components/InfluencerCard";
import EventFilterBar from "../components/EventFilterBar";
import { fetchInfluencers } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";

function InfluencersPage() {
  const { selectedCity, setSelectedCity } = useCityFilter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(selectedCity || "");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("popularity");
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
    setCategory("");
    setDate("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("popularity");
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

    async function loadInfluencers() {
      try {
        setLoading(true);
        const response = await fetchInfluencers({
          q: appliedFilters.query || undefined,
          city: appliedFilters.city || undefined,
          category: appliedFilters.category || undefined,
          date: appliedFilters.date || undefined,
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

    loadInfluencers();
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
        <h1 className="text-3xl font-bold sm:text-4xl">Influencers</h1>
        <p className="text-sm text-slate-600">Discover local creators and lifestyle experts by city, category, and audience reach.</p>
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
              <div
                key={`influencer-skeleton-${idx}`}
                className="h-[320px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : null}
        {!loading && list.length === 0 ? <p className="text-sm text-slate-500">No influencers match your current filters.</p> : null}
        {!loading
          ? list.map((item) => (
              <InfluencerCard
                key={item.id}
                item={{
                  id: item.id,
                  name: item.name,
                  category: item.category_name || "Lifestyle",
                  city: item.city_name || "City",
                  followers: item.followers_count || 0,
                  image: item.profile_image_url
                }}
                isFavorite={isFavorite("influencer", item.id)}
                onToggleFavorite={() =>
                  toggleFavorite({
                    listingType: "influencer",
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

export default InfluencersPage;
